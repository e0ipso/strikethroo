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

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');

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
  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skill-prompts'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

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
    expect(block).toContain('does not reread routing configuration');
    expect(block).toContain('exactly one JSON line');
    expect(block).toContain('Exit code `2`');
    expect(block).toContain('exit code `1`');
  });
});
