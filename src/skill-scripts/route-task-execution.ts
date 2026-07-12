#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES } from '../types';
import { resolvePlan } from './shared/plan-resolve';
import { extractPlanId } from './shared/frontmatter';
import { readTaskExecutionPolicy, type ExecutionPolicy } from './shared/execution-policy';
import {
  loadRoutingConfig,
  validateAssignments,
  selectTargets,
  toExecutionMapping,
  writeExecutionFrontmatter,
  type ResolvedExecution,
} from './shared/execution-routing';

/**
 * Deterministic half of execution routing, invoked by the task-generation
 * skills after the LLM classifies every generated task into a configured
 * profile.
 *
 *   route-task-execution.cjs profiles <plan-id>
 *     Prints the configured profiles (names + LLM-facing descriptions) for
 *     in-context classification, or no-config/disabled when routing is off.
 *
 *   route-task-execution.cjs apply <plan-id> <assignment-json-file> <current-harness>
 *     Validates the task-to-profile mapping, selects one exact target per
 *     task (first configured target, or the single optional custom
 *     resolver), writes the exact `execution` frontmatter into every task,
 *     and verifies the written files. All-or-nothing: any failure aborts
 *     before or rolls back after writing.
 *
 * Exit codes: 0 success (including no-config/disabled), 1 routing/validation
 * failure, 2 usage/infrastructure failure. Always emits one JSON line.
 */

const emit = (result: object, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

const usage = (): never =>
  emit(
    {
      kind: 'infrastructure-failure',
      detail:
        'Usage: route-task-execution.cjs profiles <plan-id> | ' +
        'route-task-execution.cjs apply <plan-id> <assignment-json-file> <current-harness>',
    },
    2
  );

interface TaskDocument {
  id: number;
  file: string;
  content: string;
}

const readTaskDocuments = (
  planDir: string
): { kind: 'tasks'; tasks: TaskDocument[] } | { kind: 'invalid'; errors: string[] } => {
  const tasksDir = path.join(planDir, 'tasks');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  } catch {
    return { kind: 'invalid', errors: [`no tasks directory at ${tasksDir}.`] };
  }

  const errors: string[] = [];
  const tasks: TaskDocument[] = [];
  const seen = new Map<number, string>();
  const taskFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name)
    .sort();
  for (const name of taskFiles) {
    const entry = { name };
    const file = path.join(tasksDir, entry.name);
    const content = fs.readFileSync(file, 'utf8');
    const id = extractPlanId(content, file);
    if (id === null) {
      errors.push(`task file ${entry.name} has no integer id in its frontmatter.`);
      continue;
    }
    const duplicate = seen.get(id);
    if (duplicate !== undefined) {
      errors.push(`task id ${id} appears in both ${duplicate} and ${entry.name}.`);
      continue;
    }
    seen.set(id, entry.name);
    tasks.push({ id, file, content });
  }
  if (tasks.length === 0) errors.push('plan has no task files to route.');
  if (errors.length > 0) return { kind: 'invalid', errors };
  return { kind: 'tasks', tasks };
};

/**
 * A routed task must parse back (through PR #53's exact policy parser) to
 * precisely the execution the routing selected: the right override kind, the
 * exact model, the same harness for external targets, and the same optional
 * reasoning effort — nothing weakened, defaulted, or reinterpreted.
 */
const policyMatchesExecution = (policy: ExecutionPolicy, execution: ResolvedExecution): boolean => {
  if (execution.harness !== undefined) {
    return (
      policy.kind === 'external-override' &&
      policy.harness === execution.harness &&
      policy.model === execution.model &&
      policy.reasoningEffort === execution.reasoning_effort
    );
  }
  return (
    policy.kind === 'native-override' &&
    policy.model === execution.model &&
    policy.reasoningEffort === execution.reasoning_effort
  );
};

const main = (): void => {
  const [mode, planIdArg, ...rest] = process.argv.slice(2);
  if ((mode !== 'profiles' && mode !== 'apply') || !planIdArg) usage();

  const resolved = resolvePlan(planIdArg as string);
  if (!resolved) {
    emit({ kind: 'infrastructure-failure', detail: `plan "${planIdArg}" did not resolve.` }, 2);
    return;
  }

  const configResult = loadRoutingConfig(resolved.strikethrooRoot, SUPPORTED_HARNESSES);
  if (configResult.kind === 'invalid') {
    emit({ kind: 'invalid-config', errors: configResult.errors }, 1);
  }
  if (configResult.kind !== 'config') {
    // Absent or empty configuration: routing is off, generation continues
    // without execution metadata (the pre-routing contract).
    emit({ kind: configResult.kind }, 0);
    return;
  }
  const config = configResult.config;

  if (mode === 'profiles') {
    emit(
      {
        kind: 'profiles',
        profiles: config.profiles.map(profile => ({
          name: profile.name,
          description: profile.description,
          targetCount: profile.targets.length,
        })),
        customResolver: config.resolverScript !== undefined,
      },
      0
    );
  }

  const [assignmentFile, currentHarness] = rest;
  if (!assignmentFile || !currentHarness) usage();
  if (!SUPPORTED_HARNESSES.includes(currentHarness as (typeof SUPPORTED_HARNESSES)[number])) {
    emit(
      {
        kind: 'infrastructure-failure',
        detail: `current harness "${currentHarness}" is not a supported harness.`,
      },
      2
    );
  }

  const documents = readTaskDocuments(resolved.planDir);
  if (documents.kind === 'invalid') {
    emit({ kind: 'invalid-tasks', errors: documents.errors }, 1);
    return;
  }

  let rawMap: unknown;
  try {
    rawMap = JSON.parse(fs.readFileSync(assignmentFile as string, 'utf8'));
  } catch (error) {
    emit(
      {
        kind: 'invalid-assignments',
        errors: [
          `could not read assignment map: ${error instanceof Error ? error.message : String(error)}`,
        ],
      },
      1
    );
    return;
  }

  const assignmentResult = validateAssignments(
    rawMap,
    documents.tasks.map(task => task.id),
    config.profiles.map(profile => profile.name)
  );
  if (assignmentResult.kind === 'invalid') {
    emit({ kind: 'invalid-assignments', errors: assignmentResult.errors }, 1);
    return;
  }

  const projectRoot = path.dirname(path.dirname(resolved.strikethrooRoot));
  const selection = selectTargets(config, assignmentResult.assignments, {
    planId: resolved.planId,
    projectRoot,
  });
  if (selection.kind === 'resolver-failure') {
    emit({ kind: 'resolver-failure', detail: selection.detail }, 1);
    return;
  }

  // Stage every mutation in memory and verify each staged document parses
  // back to the intended execution policy before any file is touched.
  const policyContext = {
    currentHarness: currentHarness as string,
    supportedHarnesses: SUPPORTED_HARNESSES,
  };
  const staged: { task: TaskDocument; next: string; execution: ResolvedExecution }[] = [];
  for (const task of documents.tasks) {
    const target = selection.selections.get(task.id);
    if (!target) {
      emit({ kind: 'routing-failure', detail: `no target selected for task ${task.id}.` }, 1);
      return;
    }
    const execution = toExecutionMapping(target, currentHarness as string);
    let next: string;
    try {
      next = writeExecutionFrontmatter(task.content, execution);
    } catch (error) {
      emit(
        {
          kind: 'routing-failure',
          detail: `task ${task.id} (${path.basename(task.file)}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
        1
      );
      return;
    }
    const policy = readTaskExecutionPolicy(next, policyContext);
    if (!policyMatchesExecution(policy, execution)) {
      emit(
        {
          kind: 'routing-failure',
          detail:
            `task ${task.id} would not verify after routing ` +
            `(${policy.kind}${'detail' in policy ? `: ${policy.detail}` : ''}).`,
        },
        1
      );
      return;
    }
    staged.push({ task, next, execution });
  }

  // Write all staged documents; restore originals on any mid-flight failure
  // so a partial routing run never survives.
  const written: TaskDocument[] = [];
  try {
    for (const { task, next } of staged) {
      fs.writeFileSync(task.file, next);
      written.push(task);
    }
    for (const { task, execution } of staged) {
      const reread = fs.readFileSync(task.file, 'utf8');
      const policy = readTaskExecutionPolicy(reread, policyContext);
      if (!policyMatchesExecution(policy, execution)) {
        throw new Error(`task ${task.id} failed post-write verification.`);
      }
    }
  } catch (error) {
    for (const task of written) {
      try {
        fs.writeFileSync(task.file, task.content);
      } catch {
        // Rollback is best-effort; the failure below still aborts generation.
      }
    }
    emit(
      {
        kind: 'infrastructure-failure',
        detail: `routing aborted and rolled back: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      2
    );
    return;
  }

  emit(
    {
      kind: 'routed',
      tasks: staged.map(({ task, execution }) => ({
        id: task.id,
        file: task.file,
        execution,
      })),
    },
    0
  );
};

try {
  main();
} catch (error) {
  emit(
    {
      kind: 'infrastructure-failure',
      detail: `execution routing failed: ${error instanceof Error ? error.message : String(error)}`,
    },
    2
  );
}
