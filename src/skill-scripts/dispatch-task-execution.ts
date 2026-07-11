#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { dispatchExternalTask } from './shared/external-dispatch';
import { readTaskExecutionPolicy } from './shared/execution-policy';

const emit = (result: object, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const mode = args[0] === 'resolve' || args[0] === 'execute' ? args.shift() : 'execute';
  if (args.length < 5 || args.slice(0, 5).some(value => !value)) {
    emit(
      {
        kind: 'infrastructure-failure',
        detail:
          'Usage: dispatch-task-execution.cjs [resolve|execute] <task-file> ' +
          '<current-harness> <workspace> <plan-id> <task-id>',
      },
      2
    );
  }
  const [taskFile, currentHarness, workspace, planId, taskId] = args as [
    string,
    string,
    string,
    string,
    string,
  ];

  const taskPath = path.resolve(taskFile);
  const taskMarkdown = fs.readFileSync(taskPath, 'utf8');
  const policy = readTaskExecutionPolicy(taskMarkdown, {
    currentHarness,
    supportedHarnesses: SUPPORTED_HARNESSES,
  });
  if (mode === 'resolve') emit(policy, 0);
  if (policy.kind !== 'external-override') {
    emit(policy.kind === 'native-default' ? { kind: 'native-default' } : policy, 0);
  }

  const externalPolicy = policy as Extract<typeof policy, { kind: 'external-override' }>;
  const result = await dispatchExternalTask({
    ...externalPolicy,
    harness: externalPolicy.harness as Harness,
    workspace: path.resolve(workspace),
    planId,
    taskId,
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
