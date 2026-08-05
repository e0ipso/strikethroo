/**
 * Integration suite for `validateWorkspace` (`src/validation/workspace.ts`) over
 * intentionally-broken temp-directory workspaces, plus the two committed
 * fixtures.
 *
 * Complements the two focused suites already in this directory:
 * `validation-metadata-gate.test.ts` covers the metadata gate's own edge cases
 * (legacy metadata that throws if the deletion scan is not short-circuited,
 * finding order, hash drift staying silent) and `validation-strict-pass.test.ts`
 * covers the frontmatter parser's tolerance contract. What lands here is the
 * whole-orchestrator view: one purpose-built broken workspace per `check`
 * identifier, asserted as the *exact* set of identifiers the workspace produces.
 *
 * Exact-set assertions rather than `toContain` are deliberate. A validator that
 * reports the right defect plus two spurious ones is as unusable as one that
 * reports nothing, and the resolution rules in `graph-checks.ts` — a reference
 * resolves against either id notion, so one disagreement yields one finding, not
 * three — are only provable by pinning the whole set.
 *
 * Real filesystem throughout, per the project's test philosophy. No `fs` mocking.
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { validateWorkspace } from '../validation/workspace';
import { CURRENT_WORKSPACE_SCHEMA_VERSION } from '../metadata';
import { Finding } from '../validation/types';

// --------------------------------------------------------------------------
// Workspace builders
// --------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Writes a file, creating parents. */
const write = (file: string, content: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
};

/**
 * Writes a healthy `.init-metadata.json`. Every non-metadata case calls this so
 * the metadata gate stays silent and the exact-set assertion isolates the check
 * under test.
 */
const meta = (root: string, overrides: Record<string, unknown> = {}): void =>
  write(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({
      version: '1.0.0',
      workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
      timestamp: '2026-01-01T00:00:00.000Z',
      files: {},
      ...overrides,
    })
  );

interface PlanOpts {
  /** Omit for a plan with no `id:` line; pass a string for a malformed one. */
  id?: number | string;
  summary?: string;
  created?: string;
  /** Markdown appended after the body, e.g. an `## Execution Blueprint` section. */
  extra?: string;
  /** Bypasses frontmatter generation entirely. */
  raw?: string;
}

const planDoc = (opts: PlanOpts): string => {
  if (opts.raw !== undefined) return opts.raw;
  const lines: string[] = [];
  if (opts.id !== undefined) lines.push(`id: ${opts.id}`);
  lines.push(`summary: "${opts.summary ?? 'A plan.'}"`);
  lines.push(`created: ${opts.created ?? '2026-01-01'}`);
  return `---\n${lines.join('\n')}\n---\n\n# Plan\n\n## Executive Summary\n\nText.\n${opts.extra ?? ''}`;
};

interface TaskOpts {
  /** Omit for a task with no `id:` line; pass a string for a malformed one. */
  id?: number | string;
  deps?: number[];
  status?: string;
  complexityScore?: number | string;
  /** Bypasses frontmatter generation entirely. */
  raw?: string;
}

const taskDoc = (opts: TaskOpts = {}): string => {
  if (opts.raw !== undefined) return opts.raw;
  const lines: string[] = [];
  if (opts.id !== undefined) lines.push(`id: ${opts.id}`);
  lines.push('group: "implementation"');
  lines.push(`dependencies: [${(opts.deps ?? []).join(', ')}]`);
  lines.push(`status: "${opts.status ?? 'pending'}"`);
  lines.push('created: 2026-01-01');
  lines.push('skills: [typescript]');
  lines.push(`complexity_score: ${opts.complexityScore ?? 3}`);
  return `---\n${lines.join('\n')}\n---\n\n# Task\n\nBody.\n`;
};

/** Writes `<area>/<dirName>/plan-<dirName>.md`. */
const plan = (
  root: string,
  dirName: string,
  opts: PlanOpts,
  area: 'plans' | 'archive' = 'plans'
): void => write(path.join(root, area, dirName, `plan-${dirName}.md`), planDoc(opts));

/** Writes `<area>/<dirName>/tasks/<file>`. */
const task = (
  root: string,
  dirName: string,
  file: string,
  opts: TaskOpts = {},
  area: 'plans' | 'archive' = 'plans'
): void => write(path.join(root, area, dirName, 'tasks', file), taskDoc(opts));

/** An `## Execution Blueprint` section with one phase per bullet group. */
const blueprint = (phases: Array<{ name: string; bullets: string[] }>): string =>
  phases
    .map((phase, i) => `\n### Phase ${i + 1}: ${phase.name}\n\n${phase.bullets.join('\n')}\n`)
    .join('')
    .replace(/^/, '\n## Execution Blueprint\n');

const checksOf = (root: string): string[] => validateWorkspace(root).findings.map(f => f.check);

const findingsFor = (root: string, check: string): Finding[] =>
  validateWorkspace(root).findings.filter(f => f.check === check);

// --------------------------------------------------------------------------

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'st-validate-ws-'));
});

afterEach(async () => {
  // chmod 000 is used to provoke the `unreadable` checks; restore before remove.
  await fs.chmod(root, 0o755).catch(() => undefined);
  await fs.remove(root);
});

// --------------------------------------------------------------------------
// One broken workspace per check, asserted as an exact identifier set.
// --------------------------------------------------------------------------

interface BrokenCase {
  /** The identifier this workspace exists to prove fires. */
  check: string;
  name: string;
  build: (root: string) => void;
  /** Every identifier the workspace must produce, sorted. */
  expected: string[];
}

const brokenCases: BrokenCase[] = [
  // ---- metadata gate ------------------------------------------------------
  {
    check: 'metadata/unreadable',
    name: 'a workspace with no .init-metadata.json',
    build: () => undefined,
    expected: ['metadata/unreadable'],
  },
  {
    check: 'metadata/schema-version-skew',
    name: 'metadata recording a stale workspaceSchemaVersion',
    build: r => meta(r, { workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION - 1 }),
    expected: ['metadata/schema-version-skew'],
  },
  {
    check: 'metadata/files-map-absent',
    name: 'metadata with no files map',
    build: r => meta(r, { files: undefined }),
    expected: ['metadata/files-map-absent'],
  },
  {
    check: 'metadata/file-deleted',
    name: 'a tracked config file deleted from disk',
    build: r => {
      meta(r, { files: { 'config/hooks/PRE_PLAN.md': 'a1', 'config/hooks/GONE.md': 'b2' } });
      write(path.join(r, 'config', 'hooks', 'PRE_PLAN.md'), '# hook\n');
    },
    expected: ['metadata/file-deleted'],
  },

  // ---- strict frontmatter pass: plans -------------------------------------
  {
    check: 'plan/frontmatter-field-missing',
    name: 'a plan with no id: line',
    build: r => {
      meta(r);
      plan(r, '1--p', { summary: 'A plan.' });
    },
    expected: ['plan/frontmatter-field-missing'],
  },
  {
    check: 'plan/frontmatter-field-malformed',
    name: 'a plan whose id will not parse',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 'abc' });
    },
    expected: ['plan/frontmatter-field-malformed'],
  },
  {
    check: 'plan/frontmatter-absent',
    name: 'a plan file with no leading frontmatter block',
    build: r => {
      meta(r);
      plan(r, '1--p', { raw: '# Plan\n\nNo frontmatter here.\n' });
    },
    expected: ['plan/frontmatter-absent'],
  },
  {
    check: 'plan/unreadable',
    name: 'a plan file that cannot be opened',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      fs.chmodSync(path.join(r, 'plans', '1--p', 'plan-1--p.md'), 0o000);
    },
    expected: ['plan/unreadable'],
  },

  // ---- strict frontmatter pass: tasks -------------------------------------
  {
    check: 'task/frontmatter-field-missing',
    name: 'a task with no id: line',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', {});
    },
    expected: ['task/frontmatter-field-missing'],
  },
  {
    check: 'task/frontmatter-field-malformed',
    name: 'a task whose complexity_score is out of range',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1, complexityScore: 42 });
    },
    expected: ['task/frontmatter-field-malformed'],
  },
  {
    check: 'task/status-invalid',
    name: 'a task whose status is a plausible typo',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1, status: 'complete' });
    },
    expected: ['task/status-invalid'],
  },
  {
    check: 'task/frontmatter-absent',
    name: 'a task file with no leading frontmatter block',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { raw: '# Task\n\nNo frontmatter here.\n' });
    },
    expected: ['task/frontmatter-absent'],
  },
  {
    check: 'task/unreadable',
    name: 'a task file that cannot be opened',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1 });
      fs.chmodSync(path.join(r, 'plans', '1--p', 'tasks', '01--a.md'), 0o000);
    },
    expected: ['task/unreadable'],
  },

  // ---- dependency graph ---------------------------------------------------
  {
    check: 'graph/dangling-dependency',
    name: 'a dependency on a task id no file carries',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1, deps: [9] });
    },
    expected: ['graph/dangling-dependency'],
  },
  {
    check: 'graph/dependency-cycle',
    name: 'a three-task dependency cycle',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1, deps: [3] });
      task(r, '1--p', '02--b.md', { id: 2, deps: [1] });
      task(r, '1--p', '03--c.md', { id: 3, deps: [2] });
    },
    expected: ['graph/dependency-cycle'],
  },
  {
    check: 'graph/dependency-cycle',
    name: 'a task that depends on itself',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      task(r, '1--p', '01--a.md', { id: 1, deps: [1] });
    },
    expected: ['graph/dependency-cycle'],
  },

  // ---- blueprint ----------------------------------------------------------
  {
    check: 'blueprint/reference-unresolved',
    name: 'a blueprint phase referencing a task that does not exist',
    build: r => {
      meta(r);
      plan(r, '1--p', {
        id: 1,
        extra: blueprint([
          { name: 'Foundation', bullets: ['- Task 01 — first', '- Task 09 — gone'] },
        ]),
      });
      task(r, '1--p', '01--a.md', { id: 1 });
    },
    expected: ['blueprint/reference-unresolved'],
  },
  {
    check: 'blueprint/task-in-no-phase',
    name: 'a task file no blueprint phase schedules',
    build: r => {
      meta(r);
      plan(r, '1--p', {
        id: 1,
        extra: blueprint([{ name: 'Foundation', bullets: ['- Task 01 — first'] }]),
      });
      task(r, '1--p', '01--a.md', { id: 1 });
      task(r, '1--p', '02--b.md', { id: 2 });
    },
    expected: ['blueprint/task-in-no-phase'],
  },

  // ---- identity -----------------------------------------------------------
  {
    check: 'identity/task-id-mismatch',
    name: 'a task whose frontmatter id disagrees with its filename prefix',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      // The two consumers resolve by different notions, so one file answers to
      // both 7 and 1. Exactly one finding names the root cause; the dependency
      // and blueprint checks stay quiet because either notion resolves.
      task(r, '1--p', '01--a.md', { id: 7 });
    },
    expected: ['identity/task-id-mismatch'],
  },
  {
    check: 'identity/task-id-mismatch',
    name: 'a dependency that resolves only through the filename notion',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      // `01--a.md` answers to 7 (frontmatter) and 1 (filename). Task 2 depends
      // on 1. A reference resolving against *either* notion is what keeps this
      // from being reported a second time as a dangling dependency: the
      // mismatch finding already names the root cause.
      task(r, '1--p', '01--a.md', { id: 7 });
      task(r, '1--p', '02--b.md', { id: 2, deps: [1] });
    },
    expected: ['identity/task-id-mismatch'],
  },
  {
    check: 'identity/duplicate-task-id',
    name: 'two task files in one plan declaring the same id',
    build: r => {
      meta(r);
      plan(r, '1--p', { id: 1 });
      // Both filenames carry prefix 01 so the duplicate is isolated: naming the
      // second file `02--b.md` would additionally trip task-id-mismatch.
      task(r, '1--p', '01--a.md', { id: 1 });
      task(r, '1--p', '01--b.md', { id: 1 });
    },
    expected: ['identity/duplicate-task-id'],
  },
  {
    check: 'identity/duplicate-plan-id',
    name: 'one plan id claimed by both plans/ and archive/',
    build: r => {
      meta(r);
      plan(r, '5--active', { id: 5 });
      plan(r, '5--archived', { id: 5 }, 'archive');
    },
    expected: ['identity/duplicate-plan-id'],
  },
];

describe('validateWorkspace over intentionally-broken workspaces', () => {
  it.each(brokenCases)('reports $check for $name', ({ build, expected }) => {
    build(root);
    expect(checksOf(root).sort()).toEqual(expected);
  });

  it('covers every check identifier the validator can emit', () => {
    // Guards the suite itself: a new check added without a case here is a check
    // no broken workspace exercises.
    const covered = new Set(brokenCases.map(c => c.check));
    expect([...covered].sort()).toEqual([
      'blueprint/reference-unresolved',
      'blueprint/task-in-no-phase',
      'graph/dangling-dependency',
      'graph/dependency-cycle',
      'identity/duplicate-plan-id',
      'identity/duplicate-task-id',
      'identity/task-id-mismatch',
      'metadata/file-deleted',
      'metadata/files-map-absent',
      'metadata/schema-version-skew',
      'metadata/unreadable',
      'plan/frontmatter-absent',
      'plan/frontmatter-field-malformed',
      'plan/frontmatter-field-missing',
      'plan/unreadable',
      'task/frontmatter-absent',
      'task/frontmatter-field-malformed',
      'task/frontmatter-field-missing',
      'task/status-invalid',
      'task/unreadable',
    ]);
  });
});

// --------------------------------------------------------------------------
// Message content: a cycle finding is only actionable if it names its members.
// --------------------------------------------------------------------------

describe('dependency cycle messages', () => {
  it('names every participating task id and the traversal order', () => {
    meta(root);
    plan(root, '1--p', { id: 1 });
    task(root, '1--p', '01--a.md', { id: 1, deps: [3] });
    task(root, '1--p', '02--b.md', { id: 2, deps: [1] });
    task(root, '1--p', '03--c.md', { id: 3, deps: [2] });

    const cycles = findingsFor(root, 'graph/dependency-cycle');

    // One finding per distinct cycle, not one per DFS entry point.
    expect(cycles).toHaveLength(1);
    const message = cycles[0]!.message;
    expect(message).toContain('tasks 1, 2, 3');
    // The trail closes back on its first member, so a reader can follow it.
    expect(message).toMatch(/1 -> 3 -> 2 -> 1/);
    expect(cycles[0]!.path).toBe(path.join('plans', '1--p'));
  });

  it('names the single task in a self-loop', () => {
    meta(root);
    plan(root, '1--p', { id: 1 });
    task(root, '1--p', '01--a.md', { id: 1, deps: [1] });

    const cycles = findingsFor(root, 'graph/dependency-cycle');

    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.message).toContain('task 1 depends on itself');
  });

  it('reports two independent cycles separately', () => {
    meta(root);
    plan(root, '1--p', { id: 1 });
    task(root, '1--p', '01--a.md', { id: 1, deps: [2] });
    task(root, '1--p', '02--b.md', { id: 2, deps: [1] });
    task(root, '1--p', '03--c.md', { id: 3, deps: [4] });
    task(root, '1--p', '04--d.md', { id: 4, deps: [3] });

    const messages = findingsFor(root, 'graph/dependency-cycle').map(f => f.message);

    expect(messages).toHaveLength(2);
    expect(messages.some(m => m.includes('tasks 1, 2'))).toBe(true);
    expect(messages.some(m => m.includes('tasks 3, 4'))).toBe(true);
  });
});

// --------------------------------------------------------------------------
// Known limitation, documented rather than fixed.
// --------------------------------------------------------------------------

describe('blueprint prose false positive (documented current behavior)', () => {
  it('reads a bulleted prose mention of "Task NN" as a phase reference', () => {
    // `TASK_REF_RE` in `src/serve/derivation.ts` matches the first `Task NN` in
    // ANY bulleted line, so a bullet whose prose merely mentions a task number
    // is indistinguishable from a phase assignment. Hardening the parser is out
    // of scope for plan 110 — it belongs to whoever deduplicates the two copies
    // of `parseBlueprintPhases` (serve + skill-scripts). This test pins the
    // current behavior so the next reader meets it as a known limitation, and
    // asserts the finding message spells the false positive out. Do NOT "fix"
    // this test by relaxing it; fix the parser and update it.
    meta(root);
    plan(root, '1--p', {
      id: 1,
      extra: blueprint([
        {
          name: 'Foundation',
          bullets: [
            '- Task 01 — the only real assignment',
            '- Note: the approach here mirrors what Task 9 did in the previous plan',
          ],
        },
      ]),
    });
    task(root, '1--p', '01--a.md', { id: 1 });

    const unresolved = findingsFor(root, 'blueprint/reference-unresolved');

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]!.message).toContain('references task 9');
    // The message must carry its own escape hatch, or the reader has no way to
    // tell a phantom reference from a genuinely missing task file.
    expect(unresolved[0]!.message).toContain('false positive');
    expect(unresolved[0]!.path).toBe(path.join('plans', '1--p', 'plan-1--p.md'));
  });

  it('skips blueprint checks entirely when a plan has no blueprint section', () => {
    // A drafted plan with tasks but no Execution Blueprint is legitimate, not a
    // defect: there is nothing to reconcile against.
    meta(root);
    plan(root, '1--p', { id: 1 });
    task(root, '1--p', '01--a.md', { id: 1 });
    task(root, '1--p', '02--b.md', { id: 2 });

    expect(validateWorkspace(root).findings).toEqual([]);
  });
});

// --------------------------------------------------------------------------
// Negative cases. Each encodes a scoping decision a future change would break.
// --------------------------------------------------------------------------

describe('scoping decisions that must not regress', () => {
  it('treats task ids as unique per plan, not globally', () => {
    // `config/STRIKETHROO.md` specifies auto-incremental task ids restarting at
    // 01 per plan, so a global uniqueness check would flag every healthy
    // multi-plan workspace.
    meta(root);
    plan(root, '1--first', { id: 1 });
    task(root, '1--first', '01--a.md', { id: 1 });
    plan(root, '2--second', { id: 2 });
    task(root, '2--second', '01--a.md', { id: 1 });

    expect(validateWorkspace(root).findings).toEqual([]);
  });

  it('does not read config/templates/TASK_TEMPLATE.md as a task', () => {
    // The shipped template carries literal placeholders (`status: "[STATUS]"`),
    // so a workspace-wide Markdown sweep would make a healthy workspace report
    // its own template as broken. The real shipped file is used rather than a
    // hand-written stand-in so the test tracks the template as it evolves.
    meta(root);
    const shipped = path.join(
      REPO_ROOT,
      'templates',
      'strikethroo',
      'config',
      'templates',
      'TASK_TEMPLATE.md'
    );
    const content = fs.readFileSync(shipped, 'utf-8');
    expect(content).toContain('status: "[STATUS]"');
    write(path.join(root, 'config', 'templates', 'TASK_TEMPLATE.md'), content);
    plan(root, '1--p', { id: 1 });

    expect(validateWorkspace(root).findings).toEqual([]);
  });

  it('does not content-check archived plans', () => {
    // Plan clarification 1 scoped content checks to `plans/`: an archived plan
    // is immutable history, so a finding against it is unfixable noise.
    // Archived plans participate in plan-id uniqueness only.
    meta(root);
    plan(root, '9--old', { id: 9 }, 'archive');
    task(root, '9--old', '01--a.md', { id: 1, deps: [2], status: 'donezo' }, 'archive');
    task(root, '9--old', '02--b.md', { id: 2, deps: [1], status: 'donezo' }, 'archive');

    expect(validateWorkspace(root).findings).toEqual([]);
  });
});

// --------------------------------------------------------------------------
// The committed fixtures. These stand in for issue #31's CI job until it exists.
// --------------------------------------------------------------------------

describe('committed fixture workspaces', () => {
  it.each([
    ['serve-workspace', path.join(REPO_ROOT, 'src', '__tests__', 'fixtures', 'serve-workspace')],
    ['capture-workspace', path.join(REPO_ROOT, 'src', 'capture', 'fixtures', 'capture-workspace')],
  ])('%s validates clean', (_name, fixtureRoot) => {
    expect(fs.existsSync(fixtureRoot)).toBe(true);

    const findings = validateWorkspace(fixtureRoot).findings;

    // Reported as identifier+path pairs: a bare count tells the next reader
    // nothing about what regressed.
    expect(findings.map(f => `${f.check} ${f.path ?? '-'}`)).toEqual([]);
  });
});
