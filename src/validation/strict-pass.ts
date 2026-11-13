/** Strict field policy over the same YAML data execution and the viewer read. */
import * as fs from 'fs';
import * as path from 'path';
import { readYamlFrontmatter } from '../skill-scripts/shared/task-frontmatter';
import { parseInteger } from '../skill-scripts/shared/frontmatter';
import { validateComplexityScore } from '../skill-scripts/shared/complexity-score';
import { describeValue, TASK_STATUSES } from '../skill-scripts/shared/task-file';
import { Finding } from './types';

type DocKind = 'plan' | 'task';
type Fields = Record<string, unknown>;
const own = (fields: Fields, field: string): boolean =>
  Object.prototype.hasOwnProperty.call(fields, field);
const renderValue = (value: unknown): string =>
  typeof value === 'string' ? value : describeValue(value);
const isTaskId = (value: unknown): boolean => {
  const id = parseInteger(value);
  return id !== undefined && id >= 0;
};

const missingField = (kind: DocKind, relPath: string, field: string): Finding => ({
  check: `${kind}/frontmatter-field-missing`,
  path: relPath,
  message: `${kind === 'plan' ? 'Plan' : 'Task'} frontmatter is missing required field \`${field}\`. Add it.`,
});

const malformedField = (
  kind: DocKind,
  relPath: string,
  field: string,
  value: unknown,
  expectation: string
): Finding => ({
  check: `${kind}/frontmatter-field-malformed`,
  path: relPath,
  message: `${kind === 'plan' ? 'Plan' : 'Task'} frontmatter field \`${field}\` is \`${renderValue(value)}\`, which is not ${expectation}.`,
});

const checkField = (
  kind: DocKind,
  relPath: string,
  fields: Fields,
  field: string,
  isValid: (value: unknown) => boolean,
  expectation: string
): Finding[] => {
  if (!own(fields, field)) return [missingField(kind, relPath, field)];
  return isValid(fields[field])
    ? []
    : [malformedField(kind, relPath, field, fields[field], expectation)];
};

const checkListField = (
  relPath: string,
  fields: Fields,
  field: string,
  isValidItem: (item: unknown) => boolean,
  expectation: string
): Finding[] => {
  if (!own(fields, field)) return [missingField('task', relPath, field)];
  const value = fields[field];
  if (value === null) return []; // A bare key means an empty list.
  if (!Array.isArray(value)) return [malformedField('task', relPath, field, value, expectation)];
  const offenders = value.filter(item => !isValidItem(item));
  return offenders.length === 0
    ? []
    : [
        malformedField(
          'task',
          relPath,
          field,
          value,
          `${expectation} (offending entries: ${offenders.map(o => '`' + renderValue(o) + '`').join(', ')})`
        ),
      ];
};

const checkPlanFields = (relPath: string, fields: Fields): Finding[] => [
  ...checkField('plan', relPath, fields, 'id', isTaskId, 'a non-negative integer'),
  ...checkField(
    'plan',
    relPath,
    fields,
    'summary',
    value => typeof value === 'string' && value.length > 0,
    'a non-empty string'
  ),
  ...checkField(
    'plan',
    relPath,
    fields,
    'created',
    value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
    'a YYYY-MM-DD date'
  ),
];

const checkTaskFields = (relPath: string, fields: Fields): Finding[] => {
  const findings = checkField('task', relPath, fields, 'id', isTaskId, 'a non-negative integer');
  if (!own(fields, 'status')) findings.push(missingField('task', relPath, 'status'));
  else if (
    typeof fields.status !== 'string' ||
    !(TASK_STATUSES as readonly string[]).includes(fields.status)
  ) {
    findings.push({
      check: 'task/status-invalid',
      path: relPath,
      message: `Task \`status\` is \`${renderValue(fields.status)}\`, which is not one of ${TASK_STATUSES.map(s => '`' + s + '`').join(', ')}.`,
    });
  }
  findings.push(
    ...checkListField(relPath, fields, 'dependencies', isTaskId, 'a list of integer task ids'),
    ...checkListField(
      relPath,
      fields,
      'skills',
      item => typeof item === 'string' && item.length > 0,
      'a list of skill names'
    )
  );
  if (own(fields, 'complexity_score') && !validateComplexityScore(fields.complexity_score).valid) {
    findings.push(
      malformedField(
        'task',
        relPath,
        'complexity_score',
        fields.complexity_score,
        'an integer from 1 to 10'
      )
    );
  }
  return findings;
};

/** Lists the names of a directory's entries of one type; missing/unreadable yields none. */
const listEntries = (dir: string, want: 'file' | 'directory'): string[] => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter(e => (want === 'file' ? e.isFile() : e.isDirectory())).map(e => e.name);
};

/**
 * Reads and checks one document, converting an unreadable file or an absent
 * frontmatter block into a finding rather than a throw.
 */
const checkDocument = (absPath: string, relPath: string, kind: DocKind): Finding[] => {
  let content: string;
  try {
    content = fs.readFileSync(absPath, 'utf-8');
  } catch {
    return [
      {
        check: `${kind}/unreadable`,
        path: relPath,
        message: `${relPath} could not be read. Check that it exists and is readable.`,
      },
    ];
  }

  const parsed = readYamlFrontmatter(content);
  if (parsed.kind === 'none') {
    return [
      {
        check: `${kind}/frontmatter-absent`,
        path: relPath,
        message: `${relPath} has no leading \`---\` frontmatter block, so none of its metadata is readable.`,
      },
    ];
  }

  if (parsed.kind === 'invalid') {
    return [{ check: `${kind}/frontmatter-malformed`, path: relPath, message: parsed.reason }];
  }
  return kind === 'plan'
    ? checkPlanFields(relPath, parsed.data)
    : checkTaskFields(relPath, parsed.data);
};

const PLANS_DIR = 'plans';
const TASKS_DIR = 'tasks';
const PLAN_FILE_RE = /^plan-.*\.md$/;
const MARKDOWN_RE = /\.md$/;

/**
 * Runs the strict frontmatter pass against an already-resolved absolute
 * workspace root. Pure: reads only, never writes, never exits.
 *
 * @param root - Absolute path to the `.ai/strikethroo` directory.
 * @returns One finding per proven frontmatter defect, each carrying a
 *          workspace-relative `path`.
 */
export function strictPass(root: string): Finding[] {
  const findings: Finding[] = [];
  const plansRoot = path.join(root, PLANS_DIR);

  for (const planDirName of listEntries(plansRoot, 'directory')) {
    const planDir = path.join(plansRoot, planDirName);

    for (const fileName of listEntries(planDir, 'file')) {
      if (!PLAN_FILE_RE.test(fileName)) continue;
      findings.push(
        ...checkDocument(
          path.join(planDir, fileName),
          path.join(PLANS_DIR, planDirName, fileName),
          'plan'
        )
      );
    }

    const tasksDir = path.join(planDir, TASKS_DIR);
    for (const fileName of listEntries(tasksDir, 'file')) {
      if (!MARKDOWN_RE.test(fileName)) continue;
      findings.push(
        ...checkDocument(
          path.join(tasksDir, fileName),
          path.join(PLANS_DIR, planDirName, TASKS_DIR, fileName),
          'task'
        )
      );
    }
  }

  return findings;
}
