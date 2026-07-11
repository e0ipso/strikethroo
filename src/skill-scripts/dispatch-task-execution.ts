#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { dispatchExternalTask } from './shared/external-dispatch';
import { readTaskExecutionPolicy } from './shared/execution-policy';

const [taskFile, currentHarness, workspace, planId, taskId] = process.argv.slice(2);
if (!taskFile || !currentHarness || !workspace || !planId || !taskId) {
  process.stderr.write(
    'Usage: dispatch-task-execution.cjs <task-file> <current-harness> <workspace> <plan-id> <task-id>\n'
  );
  process.exit(2);
}

const taskMarkdown = fs.readFileSync(path.resolve(taskFile), 'utf8');
const policy = readTaskExecutionPolicy(taskMarkdown, {
  currentHarness,
  supportedHarnesses: SUPPORTED_HARNESSES,
});
if (policy.kind === 'native-default') {
  process.stdout.write(`${JSON.stringify({ kind: 'native-default' })}\n`);
  process.exit(0);
}
if (policy.kind === 'native-override') {
  process.stdout.write(`${JSON.stringify(policy)}\n`);
  process.exit(0);
}
if (policy.kind === 'fallback') {
  process.stdout.write(`${JSON.stringify(policy)}\n`);
  process.exit(0);
}

const result = dispatchExternalTask({
  ...policy,
  harness: policy.harness as Harness,
  workspace: path.resolve(workspace),
  planId,
  taskId,
  taskFile: path.resolve(taskFile),
  taskMarkdown,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(result.kind === 'launched-failure' ? 1 : 0);
