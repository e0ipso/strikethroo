#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES } from '../types';
import { resolvePlan } from './shared/plan-resolve';
import { extractPlanId } from './shared/frontmatter';
import {
  loadRoutingConfig,
  validateAssignments,
  writeExecutionProfileFrontmatter,
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
 *   route-task-execution.cjs apply <plan-id> <assignment-json-file>
 *     Validates the task-to-profile mapping and writes the durable
 *     `execution_profile` frontmatter into every task. All-or-nothing: any failure aborts
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
        'route-task-execution.cjs apply <plan-id> <assignment-json-file>',
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

  const [assignmentFile, ...extraArgs] = rest;
  if (!assignmentFile || extraArgs.length > 0) usage();

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

  // Stage and verify every mutation in memory before any file is touched.
  const staged: { task: TaskDocument; next: string; profile: string }[] = [];
  for (const task of documents.tasks) {
    const profile = assignmentResult.assignments.get(task.id);
    if (!profile) {
      emit({ kind: 'routing-failure', detail: `no profile assigned for task ${task.id}.` }, 1);
      return;
    }
    let next: string;
    try {
      next = writeExecutionProfileFrontmatter(task.content, profile);
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
    if (!next.includes(`execution_profile: ${JSON.stringify(profile)}`)) {
      emit(
        { kind: 'routing-failure', detail: `task ${task.id} would not verify after routing.` },
        1
      );
      return;
    }
    staged.push({ task, next, profile });
  }

  // Write all staged documents; restore originals on any mid-flight failure
  // so a partial routing run never survives.
  const written: TaskDocument[] = [];
  try {
    for (const { task, next } of staged) {
      fs.writeFileSync(task.file, next);
      written.push(task);
    }
    for (const { task, next } of staged) {
      const reread = fs.readFileSync(task.file, 'utf8');
      if (reread !== next) {
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
      tasks: staged.map(({ task, profile }) => ({
        id: task.id,
        file: task.file,
        executionProfile: profile,
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
