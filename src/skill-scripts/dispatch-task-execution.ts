#!/usr/bin/env node
import * as fs from 'fs';
import { createHash } from 'crypto';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { selectDispatchTarget } from './shared/dispatch-target-selector';
import { dispatchExternalTask, type RoutedDispatchRequest } from './shared/external-dispatch';
import { checkHarnessAvailability } from './shared/harness-availability';
import { loadHarnessConfiguration } from './shared/harness-configuration';
import { isExecutionProfileName, loadRoutingConfig } from './shared/execution-routing';
import { readYamlFrontmatter } from './shared/task-frontmatter';

/** A resolved invocation plus the exact task revision it may execute. Content stays on stdin. */
type ExecutionRequest = Omit<RoutedDispatchRequest, 'taskMarkdown' | 'cliArgs'> & {
  cliArgs: readonly string[];
  taskDigest: string;
};

type ResolvedRoute =
  | { kind: 'native-default' }
  | { kind: 'native-override'; model: string; reasoningEffort?: string }
  | { kind: 'fallback'; reason: string; detail: string }
  | { kind: 'infrastructure-failure'; detail: string }
  | ({ kind: 'external-override'; harness: Harness; model: string; reasoningEffort?: string } & {
      handoff: string;
    });

const emit = (result: object, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const taskDigest = (markdown: string): string =>
  createHash('sha256').update(markdown).digest('hex');
const encodeHandoff = (request: ExecutionRequest): string =>
  Buffer.from(JSON.stringify(request), 'utf8').toString('base64url');

const decodeHandoff = (encoded: string): ExecutionRequest => {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Resolved execution request is not valid encoded JSON.');
  }
  const strings = ['harness', 'model', 'workspace', 'planId', 'taskId', 'taskFile', 'taskDigest'];
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some(key => ![...strings, 'cliArgs', 'reasoningEffort'].includes(key)) ||
    strings.some(key => {
      const field = (value as Record<string, unknown>)[key];
      return typeof field !== 'string' || field.trim() === '' || field.includes('\0');
    })
  )
    throw new Error('Resolved execution request has an invalid shape.');
  const request = value as ExecutionRequest;
  if (
    !SUPPORTED_HARNESSES.includes(request.harness) ||
    !path.isAbsolute(request.workspace) ||
    !path.isAbsolute(request.taskFile) ||
    !/^[a-f0-9]{64}$/.test(request.taskDigest) ||
    !Array.isArray(request.cliArgs) ||
    request.cliArgs.some(arg => typeof arg !== 'string' || arg === '' || arg.includes('\0')) ||
    ('reasoningEffort' in request &&
      (typeof request.reasoningEffort !== 'string' ||
        request.reasoningEffort.trim() === '' ||
        request.reasoningEffort.includes('\0')))
  )
    throw new Error('Resolved execution request has an invalid shape.');
  return request;
};

type ProfileRead = { kind: 'profile'; profile?: string } | { kind: 'rejected'; reason: string };

/**
 * Task markdown is untrusted input. It is read as YAML data only, and any
 * metadata that cannot be read that way is rejected rather than guessed at,
 * so suspicious content never silently degrades to a native run.
 */
const readProfile = (taskMarkdown: string): ProfileRead => {
  const frontmatter = readYamlFrontmatter(taskMarkdown);
  if (frontmatter.kind === 'none') return { kind: 'profile' };
  if (frontmatter.kind === 'invalid') return { kind: 'rejected', reason: frontmatter.reason };
  if (!Object.prototype.hasOwnProperty.call(frontmatter.data, 'execution_profile')) {
    return { kind: 'profile' };
  }
  const profile = frontmatter.data.execution_profile;
  if (!isExecutionProfileName(profile)) {
    return { kind: 'rejected', reason: 'execution_profile must be a non-empty string.' };
  }
  return { kind: 'profile', profile };
};

export interface ResolveDispatchRequest {
  taskMarkdown: string;
  currentHarness: Harness;
  workspace: string;
  strikethrooRoot: string;
  taskId: string;
  planId: string;
  taskFile: string;
}

/** Resolve only: selection and probes happen here, but task execution never does. */
export const resolveDispatchRoute = async (
  request: ResolveDispatchRequest
): Promise<ResolvedRoute> => {
  const read = readProfile(request.taskMarkdown);
  if (read.kind === 'rejected') {
    return { kind: 'infrastructure-failure', detail: `Task metadata rejected: ${read.reason}` };
  }
  const profile = read.profile;
  if (profile === undefined) return { kind: 'native-default' };

  const configResult = loadRoutingConfig(request.strikethrooRoot, SUPPORTED_HARNESSES);
  if (configResult.kind !== 'config') {
    return {
      kind: 'fallback',
      reason: 'invalid-execution',
      detail:
        configResult.kind === 'invalid'
          ? `Execution routing configuration is invalid: ${configResult.errors.join(' ')}`
          : `Execution profile "${profile}" cannot be resolved because routing is disabled.`,
    };
  }

  const avoided = new Set<string>();
  const unavailable: string[] = [];
  let harnessConfiguration: ReturnType<typeof loadHarnessConfiguration> | undefined;
  const candidateCount =
    configResult.config.profiles.find(candidate => candidate.name === profile)?.targets.length ?? 0;
  for (let attempt = 0; attempt < Math.max(1, candidateCount); attempt += 1) {
    const selection = selectDispatchTarget(configResult.config, profile, avoided, {
      currentHarness: request.currentHarness,
      projectRoot: request.workspace,
      taskId: Number(request.taskId),
    });
    if (selection.kind === 'native-default') {
      return { kind: 'fallback', reason: selection.reason, detail: selection.detail };
    }
    const harness = selection.target.harness as Harness | undefined;
    if (harness === undefined || harness === request.currentHarness) {
      return {
        kind: 'native-override',
        model: selection.target.model,
        ...(selection.target.reasoning_effort === undefined
          ? {}
          : { reasoningEffort: selection.target.reasoning_effort }),
      };
    }
    harnessConfiguration ??= loadHarnessConfiguration(request.strikethrooRoot);
    if (harnessConfiguration.kind === 'invalid') {
      return {
        kind: 'fallback',
        reason: 'invalid-execution',
        detail: `Harness invocation configuration is invalid: ${harnessConfiguration.errors.join(
          ' '
        )}`,
      };
    }
    const invocation = harnessConfiguration.config[harness];
    const availability = await checkHarnessAvailability({
      strikethrooRoot: request.strikethrooRoot,
      workspace: request.workspace,
      harness,
      currentHarness: request.currentHarness,
      invocation,
    });
    if (availability.available) {
      const execution: ExecutionRequest = {
        harness,
        cliArgs: invocation.cliArgs,
        model: selection.target.model,
        ...(selection.target.reasoning_effort === undefined
          ? {}
          : { reasoningEffort: selection.target.reasoning_effort }),
        workspace: request.workspace,
        planId: request.planId,
        taskId: request.taskId,
        taskFile: request.taskFile,
        taskDigest: taskDigest(request.taskMarkdown),
      };
      return {
        kind: 'external-override',
        harness,
        model: execution.model,
        ...(execution.reasoningEffort === undefined
          ? {}
          : { reasoningEffort: execution.reasoningEffort }),
        handoff: encodeHandoff(execution),
      };
    }
    unavailable.push(
      `${harness} (${availability.source === 'probe' ? 'fresh' : availability.source})`
    );
    avoided.add(selection.id);
  }
  return {
    kind: 'fallback',
    reason: 'invalid-execution',
    detail:
      `All configured targets for execution profile "${profile}" are unavailable or exhausted.` +
      (unavailable.length === 0 ? '' : ` Observations: ${unavailable.join('; ')}`),
  };
};

const main = async (): Promise<void> => {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'execute' && args.length === 1) {
    const request = decodeHandoff(args[0]!);
    const taskMarkdown = fs.readFileSync(request.taskFile, 'utf8');
    if (taskDigest(taskMarkdown) !== request.taskDigest) {
      throw new Error(
        `Task ${request.taskId} changed after route resolution. This request cannot be executed.`
      );
    }
    const { taskDigest: _digest, ...invocation } = request;
    const result = await dispatchExternalTask({ ...invocation, taskMarkdown });
    emit(
      result,
      result.kind === 'infrastructure-failure' ? 2 : result.kind === 'launched-failure' ? 1 : 0
    );
  }
  if (mode !== 'resolve' || args.length !== 5) {
    emit(
      {
        kind: 'infrastructure-failure',
        detail:
          'Usage: dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> ' +
          '<plan-id> <task-id> | execute <handoff>',
      },
      2
    );
  }
  const [taskFile, currentHarness, workspace, planId, taskId] = args as [
    string,
    Harness,
    string,
    string,
    string,
  ];
  if (
    !args.every(Boolean) ||
    !planId.trim() ||
    !taskId.trim() ||
    !SUPPORTED_HARNESSES.includes(currentHarness)
  ) {
    emit({ kind: 'infrastructure-failure', detail: 'Task dispatch arguments are invalid.' }, 2);
  }
  const taskPath = path.resolve(taskFile);
  const projectRoot = path.resolve(workspace);
  const route = await resolveDispatchRoute({
    taskMarkdown: fs.readFileSync(taskPath, 'utf8'),
    taskFile: taskPath,
    currentHarness,
    workspace: projectRoot,
    strikethrooRoot: path.join(projectRoot, '.ai', 'strikethroo'),
    planId,
    taskId,
  });
  emit(route, route.kind === 'infrastructure-failure' ? 2 : 0);
};

main().catch(error => {
  emit(
    {
      kind: 'infrastructure-failure',
      detail: `Task dispatch infrastructure failed: ${errorMessage(error)}`,
    },
    2
  );
});
