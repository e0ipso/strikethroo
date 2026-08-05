/**
 * Strict frontmatter pass over `plans/<plan>/plan-<name>.md` and
 * `plans/<plan>/tasks/<name>.md`.
 *
 * Deliberately independent of the viewer's frontmatter reader in
 * `src/serve/markdown.ts`: that one is lenient by design and cannot distinguish
 * a missing field from a malformed one, which is precisely the distinction a
 * validator must report. It runs `parseInt` and leaves the field `undefined` on
 * failure, so `id: abc` and a file with no `id:` line at all produce
 * byte-identical results. The two parsers coexist with different tolerance
 * contracts, and the viewer's is not to be "fixed" — leniency is correct for
 * rendering.
 *
 * Enumeration is likewise hand-rolled rather than routed through the shared
 * plan-scan helpers in `src/skill-scripts/shared/`, which drop any plan whose
 * `id` will not parse and are therefore structurally incapable of reporting the
 * plans most likely to be broken.
 *
 * Scope is exactly `plans/`. Archived plans are immutable history, so a finding
 * against one is unfixable noise; the shipped task template carries literal
 * placeholders (`status: "[STATUS]"`), so a workspace-wide Markdown sweep would
 * make the workspace report its own templates as broken.
 *
 * Required plan *sections* are deliberately not checked: no machine-readable
 * list of them exists, and the templates are user-editable and wholesale
 * replaceable by a strikethroo profile.
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateComplexityScore } from '../skill-scripts/shared/complexity-score';
import { Finding } from './types';

/**
 * The task `status` enum, from `templates/strikethroo/config/templates/TASK_TEMPLATE.md`.
 * Encoded here because nothing machine-readable ships it.
 */
const TASK_STATUSES = ['pending', 'in-progress', 'completed', 'needs-clarification'] as const;

/** Anchors the leading `---`-delimited block. A later `---` is body, not frontmatter. */
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** A top-level frontmatter key line; leading whitespace excludes it (nested keys are ignored). */
const KEY_LINE_RE = /^([A-Za-z_][A-Za-z0-9_-]*)[ \t]*:(.*)$/;

/** A dashed list item belonging to the key above it. */
const DASH_ITEM_RE = /^[ \t]*-[ \t]+(.*)$/;

const INTEGER_RE = /^-?\d+$/;
const NON_NEGATIVE_INTEGER_RE = /^\d+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A frontmatter value as written. The `scalar`/`list` split is the whole point:
 * downstream consumers collapse them, this pass must not.
 */
type FrontmatterValue = { kind: 'scalar'; text: string } | { kind: 'list'; items: string[] };

/** Which document a set of checks belongs to; also the `check` identifier prefix. */
type DocKind = 'plan' | 'task';

/** Removes one layer of matching surrounding quotes. */
const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
};

/** Strips a trailing unquoted YAML comment. Quoted scalars keep their `#`. */
const stripComment = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return trimmed;
  const hashIndex = trimmed.indexOf('#');
  return hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex).trim();
};

/** Normalizes a written value to its bare text: comment stripped, then unquoted. */
const bareText = (value: string): string => stripQuotes(stripComment(value));

/** Splits `[a, b]` into trimmed, unquoted items. `[]` yields an empty list. */
const parseInlineList = (value: string): string[] => {
  const inner = value.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner.split(',').map(item => stripQuotes(item));
};

/**
 * Reads the first frontmatter block into raw per-key values.
 *
 * Returns `null` when the file has no leading frontmatter block at all — a
 * different defect than an empty one. Duplicate keys are last-wins, matching the
 * existing convention; a duplicate-key finding is out of scope.
 */
const readFrontmatter = (content: string): Map<string, FrontmatterValue> | null => {
  const match = content.match(FRONTMATTER_RE);
  if (!match || match[1] === undefined) return null;

  const fields = new Map<string, FrontmatterValue>();
  const lines = match[1].split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    // Blank lines, whole-line comments, and dashed items already consumed by
    // their owning key.
    if (trimmed.length === 0 || trimmed.startsWith('#') || DASH_ITEM_RE.test(line)) continue;

    const keyMatch = line.match(KEY_LINE_RE);
    if (!keyMatch || keyMatch[1] === undefined || keyMatch[2] === undefined) continue;
    const key = keyMatch[1];
    const written = stripComment(keyMatch[2]);

    if (written.startsWith('[') && written.endsWith(']')) {
      fields.set(key, { kind: 'list', items: parseInlineList(written) });
      continue;
    }

    if (written.length > 0) {
      fields.set(key, { kind: 'scalar', text: stripQuotes(written) });
      continue;
    }

    // Empty value: collect the dashed items that follow, if any.
    const items: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (next === undefined) break;
      const dash = next.match(DASH_ITEM_RE);
      if (!dash || dash[1] === undefined) break;
      items.push(bareText(dash[1]));
      j++;
    }
    if (items.length > 0) {
      fields.set(key, { kind: 'list', items });
      i = j - 1;
    } else {
      // A bare `key:` is YAML null. Treated as an empty scalar; the list-field
      // checks accept it as an empty list, which is what every consumer already
      // sees and therefore not a provable inconsistency.
      fields.set(key, { kind: 'scalar', text: '' });
    }
  }

  return fields;
};

/** Builds the finding for a key that is absent from the frontmatter block. */
const missingField = (kind: DocKind, relPath: string, field: string): Finding => ({
  check: `${kind}/frontmatter-field-missing`,
  path: relPath,
  message: `${kind === 'plan' ? 'Plan' : 'Task'} frontmatter is missing required field \`${field}\`. Add it.`,
});

/** Builds the finding for a key that is present with a value failing its contract. */
const malformedField = (
  kind: DocKind,
  relPath: string,
  field: string,
  written: string,
  expectation: string
): Finding => ({
  check: `${kind}/frontmatter-field-malformed`,
  path: relPath,
  message: `${kind === 'plan' ? 'Plan' : 'Task'} frontmatter field \`${field}\` is \`${written}\`, which is not ${expectation}.`,
});

/** Renders a value the way it was written, for quoting back in a message. */
const renderValue = (value: FrontmatterValue): string =>
  value.kind === 'scalar' ? value.text : `[${value.items.join(', ')}]`;

/**
 * Checks a required scalar field against a predicate, distinguishing absent from
 * present-but-wrong. A list where a scalar belongs is malformed, not missing.
 */
const checkScalarField = (
  kind: DocKind,
  relPath: string,
  fields: Map<string, FrontmatterValue>,
  field: string,
  isValid: (text: string) => boolean,
  expectation: string
): Finding[] => {
  const value = fields.get(field);
  if (value === undefined) return [missingField(kind, relPath, field)];
  if (value.kind !== 'scalar' || !isValid(value.text)) {
    return [malformedField(kind, relPath, field, renderValue(value), expectation)];
  }
  return [];
};

/**
 * Checks a required list field. A bare `key:` (empty scalar) counts as an empty
 * list; any other scalar is malformed. Items are validated individually and the
 * offenders are named.
 */
const checkListField = (
  relPath: string,
  fields: Map<string, FrontmatterValue>,
  field: string,
  isValidItem: (item: string) => boolean,
  expectation: string
): Finding[] => {
  const value = fields.get(field);
  if (value === undefined) return [missingField('task', relPath, field)];
  if (value.kind === 'scalar') {
    if (value.text.length === 0) return [];
    return [malformedField('task', relPath, field, value.text, expectation)];
  }
  const offenders = value.items.filter(item => !isValidItem(item));
  if (offenders.length === 0) return [];
  return [
    malformedField(
      'task',
      relPath,
      field,
      renderValue(value),
      `${expectation} (offending entries: ${offenders.map(o => `\`${o}\``).join(', ')})`
    ),
  ];
};

/** Checks the frontmatter of one plan file. */
const checkPlanFields = (relPath: string, fields: Map<string, FrontmatterValue>): Finding[] => [
  ...checkScalarField(
    'plan',
    relPath,
    fields,
    'id',
    text => NON_NEGATIVE_INTEGER_RE.test(text),
    'a non-negative integer'
  ),
  ...checkScalarField(
    'plan',
    relPath,
    fields,
    'summary',
    text => text.length > 0,
    'a non-empty string'
  ),
  ...checkScalarField(
    'plan',
    relPath,
    fields,
    'created',
    text => ISO_DATE_RE.test(text),
    'a YYYY-MM-DD date'
  ),
];

/** Checks the `status` field: absent and unrecognized are different defects. */
const checkStatus = (relPath: string, fields: Map<string, FrontmatterValue>): Finding[] => {
  const value = fields.get('status');
  if (value === undefined) return [missingField('task', relPath, 'status')];
  const written = renderValue(value);
  if (value.kind === 'scalar' && (TASK_STATUSES as readonly string[]).includes(value.text)) {
    return [];
  }
  return [
    {
      check: 'task/status-invalid',
      path: relPath,
      message: `Task \`status\` is \`${written}\`, which is not one of ${TASK_STATUSES.map(s => `\`${s}\``).join(', ')}.`,
    },
  ];
};

/** Checks the frontmatter of one task file. */
const checkTaskFields = (relPath: string, fields: Map<string, FrontmatterValue>): Finding[] => {
  const findings: Finding[] = [
    ...checkScalarField(
      'task',
      relPath,
      fields,
      'id',
      text => NON_NEGATIVE_INTEGER_RE.test(text),
      'a non-negative integer'
    ),
    ...checkStatus(relPath, fields),
    ...checkListField(
      relPath,
      fields,
      'dependencies',
      item => INTEGER_RE.test(item),
      'a list of integer task ids'
    ),
    ...checkListField(relPath, fields, 'skills', item => item.length > 0, 'a list of skill names'),
  ];

  // `complexity_score` is required only on newly generated tasks, so its absence
  // is legitimate on older ones. When present it must satisfy its 1-10 contract,
  // which `validateComplexityScore` already encodes — reused rather than
  // duplicated so the range cannot drift.
  const complexity = fields.get('complexity_score');
  if (complexity !== undefined) {
    const written = renderValue(complexity);
    const result =
      complexity.kind === 'scalar'
        ? validateComplexityScore(complexity.text)
        : ({ valid: false, reason: 'non-integer' } as const);
    if (!result.valid) {
      findings.push(
        malformedField('task', relPath, 'complexity_score', written, 'an integer from 1 to 10')
      );
    }
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

  const fields = readFrontmatter(content);
  if (fields === null) {
    return [
      {
        check: `${kind}/frontmatter-absent`,
        path: relPath,
        message: `${relPath} has no leading \`---\` frontmatter block, so none of its metadata is readable.`,
      },
    ];
  }

  return kind === 'plan' ? checkPlanFields(relPath, fields) : checkTaskFields(relPath, fields);
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
