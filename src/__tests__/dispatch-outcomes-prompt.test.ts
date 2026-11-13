/**
 * Rendered-prompt regression tests for the task dispatch contract.
 *
 * `dispatch-task-execution.cjs` emits one JSON line carrying a discriminated
 * `kind`. Every skill that dispatches a task states the action for each kind
 * once, through the shared `dispatch-outcomes` partial, so the three consumers
 * cannot drift from each other. The kind list itself is read out of the two
 * TypeScript unions that produce it, so a new kind fails here until the partial
 * documents it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BUILT_SKILLS_ROOT } from './built-skills';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_ROOT = BUILT_SKILLS_ROOT;

/** The line the shared partial opens with; also the start of the block. */
const LEAD_IN = 'Interpret the one-line JSON result and act on its `kind` exactly once:';

/** Skills whose procedure dispatches tasks and therefore renders the partial. */
const CONSUMERS = ['st-execute-blueprint', 'st-execute-task', 'st-full-workflow'];

/**
 * Kinds only the dispatch contract uses. `infrastructure-failure` is excluded
 * because `route-task-execution.cjs` emits a result under that name too, which
 * the task-generation procedure legitimately names.
 */
const DISPATCH_ONLY = [
  'native-default',
  'native-override',
  'external-override',
  'fallback',
  'launched-success',
  'launched-failure',
];

/** Reads the `kind: '...'` literals out of one union declaration. */
const unionKinds = (file: string, declaration: string): string[] => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'skill-scripts', file), 'utf8');
  const start = source.indexOf(declaration);
  if (start === -1) throw new Error(`${declaration} not found in ${file}`);
  const body = source.slice(start, source.indexOf('\n\n', start));
  return [...body.matchAll(/kind: '([a-z-]+)'/g)].map(match => match[1]);
};

const KINDS = [
  ...new Set([
    ...unionKinds('dispatch-task-execution.ts', 'type ResolvedRoute ='),
    ...unionKinds('shared/external-dispatch.ts', 'export type ExternalDispatchResult ='),
  ]),
].sort();

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

const readSkill = (skill: string): string =>
  fs.readFileSync(path.join(SKILLS_ROOT, skill, 'SKILL.md'), 'utf8');

/** The rendered partial: its lead-in through the end of the enclosing step. */
const outcomesBlock = (content: string): string => {
  const start = content.indexOf(LEAD_IN);
  if (start === -1) return '';
  const end = content.indexOf('\n#', start);
  return content.slice(start, end === -1 ? undefined : end);
};

describe('rendered dispatch skills share one outcome contract', () => {
  test('the documented kinds are exactly the ones the script can emit', () => {
    expect(KINDS).toEqual([
      'external-override',
      'fallback',
      'infrastructure-failure',
      'launched-failure',
      'launched-success',
      'native-default',
      'native-override',
    ]);
  });

  test.each(CONSUMERS)('%s renders one outcome table covering every kind', skill => {
    const content = readSkill(skill);
    expect(occurrences(content, LEAD_IN)).toBe(1);

    const block = outcomesBlock(content);
    for (const kind of KINDS) {
      expect(block).toContain(`| \`${kind}\` |`);
      expect(occurrences(block, kind)).toBe(1);
    }
  });

  test.each(CONSUMERS)('%s states no outcome kind outside that table', skill => {
    const content = readSkill(skill);
    for (const kind of DISPATCH_ONLY) expect(occurrences(content, kind)).toBe(1);
  });

  test.each(CONSUMERS)('%s carries the handoff rules beside the table', skill => {
    const block = outcomesBlock(readSkill(skill));

    expect(block).toContain('exact opaque `handoff`');
    expect(block).toContain('Never reconstruct');
    expect(block).toContain('another task');
    expect(block).toContain('after launches begin');
  });

  test.each(CONSUMERS)('%s executes the bound request without repeated task arguments', skill => {
    const content = readSkill(skill);
    expect(content).toContain('scripts/dispatch-task-execution.cjs execute <handoff>\n');
    expect(content).not.toContain('execute <handoff> <task-file>');
    expect(outcomesBlock(content)).toContain('binds the task revision and configured invocation');
  });

  test('execute-task completes its status transition before resolving the immutable request', () => {
    const content = readSkill('st-execute-task');
    const transition = content.indexOf('### 7. Update status to in-progress');
    const resolution = content.indexOf('scripts/dispatch-task-execution.cjs resolve <task-file>');
    const execution = content.indexOf('scripts/dispatch-task-execution.cjs execute <handoff>');
    expect(transition).toBeGreaterThan(-1);
    expect(resolution).toBeGreaterThan(transition);
    expect(execution).toBeGreaterThan(resolution);
  });

  test.each(['st-execute-blueprint', 'st-full-workflow'])(
    '%s completes assignment hooks and every route before task launches',
    skill => {
      const content = readSkill(skill);
      const phase = content.slice(content.indexOf('Identify all tasks scheduled for this phase'));
      const assignment = phase.indexOf('PRE_TASK_ASSIGNMENT.md');
      const resolution = phase.indexOf('scripts/dispatch-task-execution.cjs resolve <task-file>');
      const barrier = phase.indexOf('After interpreting all route results');
      const execution = phase.indexOf('scripts/dispatch-task-execution.cjs execute <handoff>');
      expect(assignment).toBeGreaterThan(-1);
      expect(resolution).toBeGreaterThan(assignment);
      expect(barrier).toBeGreaterThan(resolution);
      expect(execution).toBeGreaterThan(barrier);
    }
  );

  test.each(CONSUMERS)('%s sends both failure kinds through the error hook', skill => {
    const rows = outcomesBlock(readSkill(skill)).split('\n');
    const rowIndex = (kind: string): number =>
      rows.findIndex(row => row.startsWith(`| \`${kind}\` |`));

    // Both failure kinds share one action, written on the first row of the pair,
    // so the second row only resolves while it directly follows the first.
    const launched = rowIndex('launched-failure');
    expect(launched).toBeGreaterThan(-1);
    expect(rowIndex('infrastructure-failure')).toBe(launched + 1);

    expect(rows[launched]).toContain('`failed`');
    expect(rows[launched]).toContain('POST_ERROR_DETECTION.md');
    expect(rows[launched]).toContain('Never retry it natively');
  });
});
