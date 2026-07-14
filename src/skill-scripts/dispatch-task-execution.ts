#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { selectDispatchTarget } from './shared/dispatch-target-selector';
import { dispatchExternalTask } from './shared/external-dispatch';
import { checkHarnessAvailability } from './shared/harness-availability';
import { loadRoutingConfig } from './shared/execution-routing';

interface ExternalHandoff {
  version: 1;
  kind: 'external-override';
  harness: Harness;
  model: string;
  reasoningEffort?: string;
}

type ResolvedRoute =
  | { kind: 'native-default' }
  | { kind: 'native-override'; model: string; reasoningEffort?: string }
  | { kind: 'fallback'; reason: string; detail: string }
  | ({ kind: 'external-override'; harness: Harness; model: string; reasoningEffort?: string } & {
      handoff: string;
    });

const emit = (result: object, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const encodeHandoff = (route: Omit<ExternalHandoff, 'version'>): string =>
  Buffer.from(JSON.stringify({ version: 1, ...route }), 'utf8').toString('base64url');

const decodeHandoff = (encoded: string): ExternalHandoff => {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Resolved execution handoff is not valid encoded JSON.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Resolved execution handoff must be an object.');
  }
  const value = raw as Record<string, unknown>;
  const allowed = ['version', 'kind', 'harness', 'model', 'reasoningEffort'];
  if (
    Object.keys(value).some(key => !allowed.includes(key)) ||
    value.version !== 1 ||
    value.kind !== 'external-override' ||
    typeof value.harness !== 'string' ||
    !SUPPORTED_HARNESSES.includes(value.harness as Harness) ||
    typeof value.model !== 'string' ||
    value.model.length === 0 ||
    ('reasoningEffort' in value && typeof value.reasoningEffort !== 'string')
  ) {
    throw new Error('Resolved execution handoff has an invalid shape.');
  }
  return value as unknown as ExternalHandoff;
};

const externalRoute = (
  harness: Harness,
  model: string,
  reasoningEffort?: string
): ResolvedRoute => {
  const exact = {
    kind: 'external-override' as const,
    harness,
    model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
  };
  return { ...exact, handoff: encodeHandoff(exact) };
};

const readProfile = (taskMarkdown: string): string | undefined => {
  const parsed = matter(taskMarkdown, {});
  const profile = parsed.data.execution_profile;
  return typeof profile === 'string' && profile.trim() ? profile : undefined;
};

export interface ResolveDispatchRequest {
  taskMarkdown: string;
  currentHarness: Harness;
  workspace: string;
  strikethrooRoot: string;
  taskId: number;
}

/** Resolve only: selection and probes happen here, but task execution never does. */
export const resolveDispatchRoute = async (
  request: ResolveDispatchRequest
): Promise<ResolvedRoute> => {
  const profile = readProfile(request.taskMarkdown);
  if (!profile) return { kind: 'native-default' };

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
  const candidateCount =
    configResult.config.profiles.find(candidate => candidate.name === profile)?.targets.length ?? 0;
  for (let attempt = 0; attempt < Math.max(1, candidateCount); attempt += 1) {
    const selection = selectDispatchTarget(configResult.config, profile, avoided, {
      projectRoot: request.workspace,
      taskId: request.taskId,
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
    const availability = await checkHarnessAvailability({
      strikethrooRoot: request.strikethrooRoot,
      workspace: request.workspace,
      harness,
      currentHarness: request.currentHarness,
    });
    if (availability.available) {
      return externalRoute(harness, selection.target.model, selection.target.reasoning_effort);
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
  const args = process.argv.slice(2);
  const mode = args.shift();
  if ((mode !== 'resolve' && mode !== 'execute') || args.length < (mode === 'execute' ? 6 : 5)) {
    emit(
      {
        kind: 'infrastructure-failure',
        detail:
          'Usage: dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> ' +
          '<plan-id> <task-id> | execute <handoff> <task-file> <current-harness> <workspace> ' +
          '<plan-id> <task-id>',
      },
      2
    );
  }
  const handoffArg = mode === 'execute' ? args.shift() : undefined;
  const [taskFile, currentHarnessRaw, workspace, planId, taskId] = args as string[];
  if (
    !taskFile ||
    !currentHarnessRaw ||
    !workspace ||
    !planId ||
    !taskId ||
    !SUPPORTED_HARNESSES.includes(currentHarnessRaw as Harness)
  ) {
    emit({ kind: 'infrastructure-failure', detail: 'Task dispatch arguments are invalid.' }, 2);
  }
  const validTaskFile = taskFile!;
  const validCurrentHarness = currentHarnessRaw as Harness;
  const validWorkspace = workspace!;
  const validPlanId = planId!;
  const validTaskId = taskId!;
  const taskPath = path.resolve(validTaskFile);
  const taskMarkdown = fs.readFileSync(taskPath, 'utf8');
  if (mode === 'resolve') {
    emit(
      await resolveDispatchRoute({
        taskMarkdown,
        currentHarness: validCurrentHarness,
        workspace: path.resolve(validWorkspace),
        strikethrooRoot: path.join(path.resolve(validWorkspace), '.ai', 'strikethroo'),
        taskId: Number(validTaskId),
      }),
      0
    );
  }

  const handoff = decodeHandoff(handoffArg!);
  const result = await dispatchExternalTask({
    harness: handoff.harness,
    model: handoff.model,
    ...(handoff.reasoningEffort === undefined ? {} : { reasoningEffort: handoff.reasoningEffort }),
    workspace: path.resolve(validWorkspace),
    planId: validPlanId,
    taskId: validTaskId,
    taskFile: taskPath,
    taskMarkdown,
  });
  emit(
    result,
    result.kind === 'infrastructure-failure' ? 2 : result.kind === 'launched-failure' ? 1 : 0
  );
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
