import * as fs from 'fs';
import * as path from 'path';
import { readYamlFrontmatter } from './task-frontmatter';

/**
 * Raw text of the leading frontmatter block, for consumers that match one
 * field with a regex (see task-complexity.ts). Status and dependencies go
 * through `readTaskMetadata` instead.
 */
export const extractFrontmatter = (content: string): string | null => {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  return match && match[1] ? match[1] : null;
};

export const findTaskFile = (planDir: string, taskId: string | number): string | null => {
  const taskDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(taskDir)) return null;

  const idStr = String(taskId);
  const variations = [idStr, idStr.padStart(2, '0'), idStr.replace(/^0+/, '') || '0'];
  const uniqueVariations = [...new Set(variations)];

  try {
    const files = fs.readdirSync(taskDir);
    return (
      uniqueVariations.reduce<string | null>((acc, v) => {
        if (acc) return acc;
        const match = files.find(f => f.startsWith(`${v}--`) && f.endsWith('.md'));
        return match ? path.join(taskDir, match) : null;
      }, null) ?? null
    );
  } catch (_err) {
    return null;
  }
};

/**
 * Statuses the readiness reader accepts. The first four are the task
 * template's; `failed` is written by `st-execute-task` after an unsuccessful
 * run, and its step 4 re-executes such a task. `src/validation/strict-pass.ts`
 * keeps its own list on purpose.
 */
export const TASK_STATUSES = [
  'pending',
  'in-progress',
  'completed',
  'needs-clarification',
  'failed',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskMetadata {
  readonly status: TaskStatus;
  readonly dependencies: readonly number[];
}

export type TaskMetadataResult =
  | { kind: 'metadata'; metadata: TaskMetadata }
  | { kind: 'rejected'; reason: string };

const MAX_VALUE_PREVIEW = 80;

/**
 * `JSON.stringify` replacer that prints a value already on its own ancestor
 * path as `"[Circular]"`. A YAML alias can reference its enclosing node
 * (`&d [*d]`), which the plain call throws on. The ancestor path, not a seen
 * set, is what keeps a shared alias (`[&a {x: 1}, *a]`) printing both copies.
 */
const circularReplacer = (): ((this: unknown, key: string, value: unknown) => unknown) => {
  const ancestors: unknown[] = [];
  return function (this: unknown, _key: string, value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.includes(value)) return '[Circular]';
    ancestors.push(value);
    return value;
  };
};

/** JSON preview of an offending value, bounded so a reason stays one line. Never throws. */
const describeValue = (value: unknown): string => {
  let json: string | undefined;
  try {
    json = JSON.stringify(value, circularReplacer());
  } catch {
    json = undefined;
  }
  const text = json ?? String(value);
  return text.length > MAX_VALUE_PREVIEW ? `${text.slice(0, MAX_VALUE_PREVIEW)}…` : text;
};

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);

/** A task id is a non-negative integer, written bare or as a string of digits. */
const toTaskId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
};

/** Absent means no dependencies; anything but a list of task ids is `null`. */
const readDependencies = (value: unknown): readonly number[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids: number[] = [];
  for (const item of value) {
    const id = toTaskId(item);
    if (id === null) return null;
    ids.push(id);
  }
  return ids;
};

/**
 * Reads the status and dependencies a readiness check needs from a task
 * document. The frontmatter is parsed as YAML data only through
 * `readYamlFrontmatter`, then both fields are checked for shape, so a document
 * this reader did not understand is a rejection, never a task with no
 * dependencies or a non-blocking status. Never throws.
 */
export const readTaskMetadata = (markdown: string): TaskMetadataResult => {
  const frontmatter = readYamlFrontmatter(markdown);
  if (frontmatter.kind === 'none') {
    return { kind: 'rejected', reason: 'task frontmatter not found' };
  }
  if (frontmatter.kind === 'invalid') return { kind: 'rejected', reason: frontmatter.reason };

  const { status, dependencies } = frontmatter.data;
  const expected = TASK_STATUSES.join(', ');
  if (status === undefined) {
    return { kind: 'rejected', reason: `status is missing; expected one of ${expected}` };
  }
  if (!isTaskStatus(status)) {
    return {
      kind: 'rejected',
      reason: `status ${describeValue(status)} is not one of ${expected}`,
    };
  }
  const ids = readDependencies(dependencies);
  if (ids === null) {
    return {
      kind: 'rejected',
      reason: `dependencies must be a list of integer task ids; got ${describeValue(dependencies)}`,
    };
  }
  return { kind: 'metadata', metadata: { status, dependencies: ids } };
};

/**
 * Changes only the root-level status line in a task's leading frontmatter.
 * The raw replacement preserves every other byte, including nested mappings.
 */
export const rewriteTaskStatus = (taskMarkdown: string, status: string): string => {
  const match = taskMarkdown.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) throw new Error('missing frontmatter');

  const opening = match[1];
  const frontmatter = match[2];
  const closing = match[3];
  if (opening === undefined || frontmatter === undefined || closing === undefined) {
    throw new Error('missing frontmatter');
  }
  const statusLines = frontmatter.match(/^status:[^\r\n]*/gm) ?? [];
  if (statusLines.length === 0) throw new Error('missing root status');
  if (statusLines.length > 1) throw new Error('duplicate root status');
  const statusLine = statusLines[0];
  if (statusLine === undefined) throw new Error('missing root status');

  const replacement = statusLine.replace(
    /^status:([ \t]*)(?:["'][^\r\n]*?["']|[^\r\n]*?)([ \t]*(?:#.*)?)$/,
    (_line, spacing: string, comment: string) => `status:${spacing}"${status}"${comment}`
  );
  return `${opening}${frontmatter.replace(statusLine, replacement)}${closing}${taskMarkdown.slice(
    match[0].length
  )}`;
};

export interface TaskReadinessIssue {
  taskId: string;
  kind: 'missing' | 'invalid-metadata' | 'needs-clarification' | 'unresolved-dependency';
  detail: string;
}

const readDocument = (file: string): string | null => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (_err) {
    return null;
  }
};

export const collectTaskReadinessIssues = (
  planDir: string,
  taskId: string | number
): TaskReadinessIssue[] => {
  const idLabel = String(taskId);
  const issue = (kind: TaskReadinessIssue['kind'], detail: string): TaskReadinessIssue => ({
    taskId: idLabel,
    kind,
    detail,
  });

  const taskFile = findTaskFile(planDir, taskId);
  if (!taskFile) return [issue('missing', 'task file not found')];
  const taskContent = readDocument(taskFile);
  if (taskContent === null) return [issue('invalid-metadata', 'task file could not be read')];

  const task = readTaskMetadata(taskContent);
  if (task.kind === 'rejected') return [issue('invalid-metadata', task.reason)];

  const issues: TaskReadinessIssue[] = [];
  if (task.metadata.status === 'needs-clarification') {
    issues.push(issue('needs-clarification', 'status is needs-clarification'));
  }

  for (const depId of task.metadata.dependencies) {
    const depFile = findTaskFile(planDir, depId);
    if (!depFile) {
      issues.push(issue('unresolved-dependency', `dependency ${depId} not found`));
      continue;
    }
    const depContent = readDocument(depFile);
    if (depContent === null) {
      issues.push(issue('unresolved-dependency', `dependency ${depId} could not be read`));
      continue;
    }
    const dep = readTaskMetadata(depContent);
    if (dep.kind === 'rejected') {
      issues.push(
        issue('unresolved-dependency', `dependency ${depId} has invalid metadata: ${dep.reason}`)
      );
      continue;
    }
    if (dep.metadata.status !== 'completed') {
      issues.push(
        issue('unresolved-dependency', `dependency ${depId} status is ${dep.metadata.status}`)
      );
    }
  }

  return issues;
};
