import * as fs from 'fs';
import * as path from 'path';

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

export const extractDependencies = (frontmatter: string): string[] => {
  const lines = frontmatter.split('\n');
  const dependencies: string[] = [];
  let inDependenciesSection = false;

  for (const line of lines) {
    if (line.match(/^dependencies:/)) {
      inDependenciesSection = true;
      const arrayMatch = line.match(/\[(.*)\]/);
      if (arrayMatch && arrayMatch[1]) {
        const deps = arrayMatch[1]
          .split(',')
          .map(dep => dep.trim().replace(/['"]/g, ''))
          .filter(dep => dep.length > 0);
        dependencies.push(...deps);
        inDependenciesSection = false;
      }
      continue;
    }

    if (inDependenciesSection && line.match(/^[^ ]/) && !line.match(/^[ \t]*-/)) {
      inDependenciesSection = false;
    }

    if (inDependenciesSection && line.match(/^[ \t]*-/)) {
      const dep = line
        .replace(/^[ \t]*-[ \t]*/, '')
        .replace(/[ \t]*$/, '')
        .replace(/['"]/g, '');
      if (dep.length > 0) dependencies.push(dep);
    }
  }

  return dependencies;
};

export const extractStatus = (frontmatter: string): string | null => {
  for (const line of frontmatter.split('\n')) {
    if (line.match(/^status:/)) {
      return line
        .replace(/^status:[ \t]*/, '')
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .trim();
    }
  }
  return null;
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
  kind: 'missing' | 'needs-clarification' | 'unresolved-dependency';
  detail: string;
}

export const collectTaskReadinessIssues = (
  planDir: string,
  taskId: string | number
): TaskReadinessIssue[] => {
  const issues: TaskReadinessIssue[] = [];
  const taskFile = findTaskFile(planDir, taskId);
  const idLabel = String(taskId);

  if (!taskFile || !fs.existsSync(taskFile)) {
    issues.push({ taskId: idLabel, kind: 'missing', detail: 'task file not found' });
    return issues;
  }

  const taskContent = fs.readFileSync(taskFile, 'utf8');
  const frontmatter = extractFrontmatter(taskContent);
  if (!frontmatter) {
    issues.push({ taskId: idLabel, kind: 'missing', detail: 'task frontmatter not found' });
    return issues;
  }

  const status = extractStatus(frontmatter);
  if (status === 'needs-clarification') {
    issues.push({
      taskId: idLabel,
      kind: 'needs-clarification',
      detail: 'status is needs-clarification',
    });
  }

  for (const depId of extractDependencies(frontmatter)) {
    const depFile = findTaskFile(planDir, depId);
    if (!depFile || !fs.existsSync(depFile)) {
      issues.push({
        taskId: idLabel,
        kind: 'unresolved-dependency',
        detail: `dependency ${depId} not found`,
      });
      continue;
    }

    const depContent = fs.readFileSync(depFile, 'utf8');
    const depFrontmatter = extractFrontmatter(depContent);
    if (!depFrontmatter) {
      issues.push({
        taskId: idLabel,
        kind: 'unresolved-dependency',
        detail: `dependency ${depId} has no frontmatter`,
      });
      continue;
    }

    const depStatus = extractStatus(depFrontmatter);
    if (depStatus !== 'completed') {
      issues.push({
        taskId: idLabel,
        kind: 'unresolved-dependency',
        detail: `dependency ${depId} status is ${depStatus ?? 'unknown'}`,
      });
    }
  }

  return issues;
};
