import * as fs from 'fs';
import * as path from 'path';
import { readYamlFrontmatter } from './task-frontmatter';

import { parseInteger, rewriteFrontmatter } from './frontmatter';

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
 * uses the same list.
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
 * JSON preview of an offending value, bounded so a reason stays one line.
 * Never throws.
 *
 * Writing stops once the preview is full, so shared YAML aliases cannot make
 * the work exponential: `&a1 [*a0, *a0]` doubled 32 times is a few hundred
 * bytes of YAML and billions of nodes. A value already on its own ancestor
 * path (`&d [*d]`) prints as `"[Circular]"`; a shared alias that is not a
 * cycle (`[&a {x: 1}, *a]`) prints both copies.
 */
export const describeValue = (value: unknown): string => {
  let text = '';
  const ancestors: object[] = [];
  const full = () => text.length > MAX_VALUE_PREVIEW;
  const write = (node: unknown): void => {
    if (full()) return;
    if (typeof node !== 'object' || node === null || node instanceof Date) {
      text += JSON.stringify(node) ?? String(node);
      return;
    }
    if (ancestors.includes(node)) {
      text += '"[Circular]"';
      return;
    }
    ancestors.push(node);
    if (Array.isArray(node)) {
      text += '[';
      for (let i = 0; i < node.length && !full(); i++) {
        if (i > 0) text += ',';
        write(node[i] ?? null);
      }
      text += ']';
    } else {
      text += '{';
      let first = true;
      for (const [key, item] of Object.entries(node)) {
        if (full()) break;
        text += `${first ? '' : ','}${JSON.stringify(key)}:`;
        first = false;
        write(item);
      }
      text += '}';
    }
    ancestors.pop();
  };
  try {
    write(value);
  } catch {
    text = String(value);
  }
  return text.length > MAX_VALUE_PREVIEW ? `${text.slice(0, MAX_VALUE_PREVIEW)}…` : text;
};

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);

/** IDs have the same integer semantics in allocation, dependency validation, and execution. */
const toTaskId = (value: unknown): number | null => {
  const id = parseInteger(value);
  return id !== undefined && id >= 0 ? id : null;
};

/**
 * Absent, or a bare `dependencies:` key (YAML null), means no dependencies, as
 * `validate` accepts it; anything but a list of task ids is `null`.
 */
const readDependencies = (value: unknown): readonly number[] | null => {
  if (value === undefined || value === null) return [];
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
export const rewriteTaskStatus = (taskMarkdown: string, status: string): string =>
  rewriteFrontmatter(taskMarkdown, frontmatter => {
    const statusLines = frontmatter.match(/^status:[^\r\n]*/gm) ?? [];
    if (statusLines.length === 0) throw new Error('missing root status');
    if (statusLines.length > 1) throw new Error('duplicate root status');
    const statusLine = statusLines[0];
    if (statusLine === undefined) throw new Error('missing root status');

    const replacement = statusLine.replace(
      /^status:([ \t]*)(?:["'][^\r\n]*?["']|[^\r\n]*?)([ \t]*(?:#.*)?)$/,
      (_line, spacing: string, comment: string) => `status:${spacing}"${status}"${comment}`
    );
    return frontmatter.replace(statusLine, replacement);
  });

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

export interface TaskReadiness {
  taskFile: string | null;
  dependencies: { taskId: number; status: TaskStatus | null }[];
  issues: TaskReadinessIssue[];
}

/** Inspect readiness once, so the verdict and dependency report use the same observations. */
export const inspectTaskReadiness = (planDir: string, taskId: string | number): TaskReadiness => {
  const idLabel = String(taskId);
  const issue = (kind: TaskReadinessIssue['kind'], detail: string): TaskReadinessIssue => ({
    taskId: idLabel,
    kind,
    detail,
  });

  const taskFile = findTaskFile(planDir, taskId);
  const dependencies: TaskReadiness['dependencies'] = [];
  const rejected = (kind: TaskReadinessIssue['kind'], detail: string): TaskReadiness => ({
    taskFile,
    dependencies,
    issues: [issue(kind, detail)],
  });
  if (!taskFile) return rejected('missing', 'task file not found');
  const taskContent = readDocument(taskFile);
  if (taskContent === null) return rejected('invalid-metadata', 'task file could not be read');
  const task = readTaskMetadata(taskContent);
  if (task.kind === 'rejected') return rejected('invalid-metadata', task.reason);

  const issues: TaskReadinessIssue[] = [];
  if (task.metadata.status === 'needs-clarification') {
    issues.push(issue('needs-clarification', 'status is needs-clarification'));
  }

  for (const depId of task.metadata.dependencies) {
    const dependency: TaskReadiness['dependencies'][number] = { taskId: depId, status: null };
    dependencies.push(dependency);
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
    dependency.status = dep.metadata.status;
    if (dep.metadata.status !== 'completed') {
      issues.push(
        issue('unresolved-dependency', `dependency ${depId} status is ${dep.metadata.status}`)
      );
    }
  }

  return { taskFile, dependencies, issues };
};

export const collectTaskReadinessIssues = (
  planDir: string,
  taskId: string | number
): TaskReadinessIssue[] => inspectTaskReadiness(planDir, taskId).issues;
