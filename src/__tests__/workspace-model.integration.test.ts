/**
 * Integration tests for the serve workspace data layer
 * (`src/serve/workspace-model.ts`).
 *
 * Following the project's "write a few tests, mostly integration" philosophy,
 * coverage is driven through the assembled model against real on-disk data:
 * a committed fixture workspace (`src/__tests__/fixtures/serve-workspace/`) for
 * the happy path, and small synthetic fixtures in a temp directory for edge
 * cases. The parsing primitives are exercised transitively rather than via
 * exhaustive unit tests.
 *
 * The fixture workspace holds real, representative plan data copied from this
 * project's own `.ai/strikethroo/` (which is gitignored and therefore absent in
 * CI). It carries the archived plan 38 (`38--fix-jekyll-link-baseurl`: two
 * completed tasks, a two-phase blueprint), the archived plan 83
 * (`83--workspace-data-layer`, whose body has an Architectural Approach mermaid
 * block), and the full set of 11 config hooks and 4 config templates. These
 * tests assert that observable shape so they run identically on any checkout.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { vi } from 'vitest';
import {
  getPlanSummaries,
  getPlanDetail,
  getConfig,
  type PlanDetail,
  type PlanSummary,
} from '../serve/workspace-model';
import { getAllPlans } from '../skill-scripts/shared/plan-scan';
import * as markdown from '../serve/markdown';
import * as safeFs from '../skill-scripts/shared/safe-fs';
import {
  BLUEPRINT_SECTION,
  TRAILING_EXECUTION_SUMMARY,
  EXPECTED_PHASE_TASK_IDS,
} from './fixtures/blueprint-trailing-summary';

// Pass-through spies on the detail-only work (`sectionBody`, mermaid
// extraction) and on the contained reads that only `getConfig` performs, so
// the summary path can be shown not to reach them. Behaviour is unchanged.
vi.mock('../serve/markdown', async importOriginal => {
  const actual = await importOriginal<typeof import('../serve/markdown')>();
  return {
    ...actual,
    sectionBody: vi.fn(actual.sectionBody),
    extractMermaidBlocks: vi.fn(actual.extractMermaidBlocks),
  };
});
vi.mock('../skill-scripts/shared/safe-fs', async importOriginal => {
  const actual = await importOriginal<typeof import('../skill-scripts/shared/safe-fs')>();
  return {
    ...actual,
    resolveContained: vi.fn(actual.resolveContained),
    readContainedFile: vi.fn(actual.readContainedFile),
  };
});

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');

describe('workspace-model against the committed fixture workspace', () => {
  it('derives plan 38 state and counts from its real on-disk shape', () => {
    const plans = getPlanSummaries(FIXTURE_ROOT);
    const plan38 = plans.find(p => p.id === 38);
    expect(plan38).toBeDefined();
    // Real plan 38 (38--fix-jekyll-link-baseurl): two completed tasks, archived,
    // two-phase blueprint.
    expect(plan38!.state).toBe('done');
    expect(plan38!.done).toBe(2);
    expect(plan38!.total).toBe(2);
    expect(plan38!.phaseCount).toBe(2);
    expect(plan38!.archived).toBe(true);
  });

  it('extracts an Architectural Approach mermaid block from a plan that has one', () => {
    // Plan 83 (this very plan) carries an Architectural Approach mermaid block.
    const detail = getPlanDetail(FIXTURE_ROOT, '83--workspace-data-layer');
    expect(detail).toBeDefined();
    const arch = detail!.mermaid.filter(b => b.isArchitecturalApproach);
    expect(arch.length).toBeGreaterThan(0);
    expect(arch[0]!.source.trim().length).toBeGreaterThan(0);
  });

  it('parses archived plans and flags them archived: true', () => {
    const archived = getPlanSummaries(FIXTURE_ROOT).filter(p => p.archived);
    expect(archived.length).toBeGreaterThan(0);
  });

  it('enumerates 11 config hooks and 4 config templates with id, file, and content', () => {
    const config = getConfig(FIXTURE_ROOT);
    expect(config.hooks).toHaveLength(11);
    expect(config.templates).toHaveLength(4);
    expect(config.hooks.map(h => h.id)).toContain('TASK_EXECUTION_ROUTING');
    for (const entry of [...config.hooks, ...config.templates]) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.file.length).toBeGreaterThan(0);
      expect(typeof entry.content).toBe('string');
    }
  });

  it('exposes the workspace config.yaml as its own config slice', () => {
    // config.yaml backs the Customize section's Config form; it is a single
    // structured file, not a member of the hooks/templates card grids.
    const config = getConfig(FIXTURE_ROOT);
    expect(config.workspace).not.toBeNull();
    expect(config.workspace?.id).toBe('config');
    expect(config.workspace?.relPath).toBe(path.join('config', 'config.yaml'));
    expect(config.workspace?.content).toContain('execution_routing');
    const gridFiles = [...config.hooks, ...config.templates].map(e => e.relPath);
    expect(gridFiles.some(f => f.endsWith('.yaml'))).toBe(false);
  });
});

describe('workspace-model against synthetic fixtures', () => {
  let tmpRoot: string;

  const writeMetadata = (root: string): void => {
    fs.writeFileSync(
      path.join(root, '.init-metadata.json'),
      JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
      'utf8'
    );
  };

  const makePlan = (
    root: string,
    slug: string,
    planBody: string,
    tasks: Array<{ name: string; body: string }> = [],
    base: 'plans' | 'archive' = 'plans'
  ): void => {
    const dir = path.join(root, base, slug);
    fs.mkdirSync(dir, { recursive: true });
    const id = slug.split('--')[0];
    fs.writeFileSync(
      path.join(dir, `plan-${slug}.md`),
      planBody.replace('{{ID}}', id ?? '0'),
      'utf8'
    );
    if (tasks.length > 0) {
      const tasksDir = path.join(dir, 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });
      tasks.forEach(t => fs.writeFileSync(path.join(tasksDir, t.name), t.body, 'utf8'));
    }
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wsmodel-'));
    fs.mkdirSync(path.join(tmpRoot, 'strikethroo'), { recursive: true });
    writeMetadata(path.join(tmpRoot, 'strikethroo'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('parses a plan.md with no tasks/ directory as drafted without throwing', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    makePlan(
      root,
      '10--no-tasks-plan',
      '---\nid: 10\nsummary: "A drafted plan"\ncreated: 2026-05-29\n---\n# No Tasks Plan\n\nBody.\n'
    );

    expect(() => getPlanSummaries(root)).not.toThrow();
    const plan = getPlanSummaries(root).find(p => p.id === 10);
    expect(plan).toBeDefined();
    expect(plan!.state).toBe('drafted');
    expect(plan!.total).toBe(0);
  });

  it('treats an unknown/in-progress task status as started without throwing', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    makePlan(
      root,
      '11--unknown-status',
      '---\nid: 11\nsummary: "Plan with an unknown task status"\ncreated: 2026-05-29\n---\n# Unknown Status Plan\n\nBody.\n',
      [
        {
          name: '01--weird.md',
          body: '---\nid: 1\ngroup: "g"\ndependencies: []\nstatus: "in-progress"\nskills: [typescript]\n---\n# Weird Task\n\nBody.\n',
        },
      ]
    );

    expect(() => getPlanSummaries(root)).not.toThrow();
    const plan = getPlanSummaries(root).find(p => p.id === 11);
    expect(plan).toBeDefined();
    // One task, started but not completed -> doing, 0 of 1 done.
    expect(plan!.state).toBe('doing');
    expect(plan!.done).toBe(0);
    expect(plan!.total).toBe(1);
  });

  it('parses both inline-array and dashed-list frontmatter list forms', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    makePlan(
      root,
      '12--list-forms',
      '---\nid: 12\nsummary: "List form variance"\ncreated: 2026-05-29\n---\n# List Forms\n\nBody.\n',
      [
        {
          // inline-array dependencies, dashed-list skills
          name: '01--inline-and-dashed.md',
          body: '---\nid: 1\ngroup: "g"\ndependencies: []\nstatus: "pending"\nskills:\n  - typescript\n  - vitest\n---\n# First\n\nBody.\n',
        },
        {
          // inline-array deps with values, inline-array skills
          name: '02--inline-both.md',
          body: '---\nid: 2\ngroup: "g"\ndependencies: [1]\nstatus: "pending"\nskills: [typescript, vitest]\n---\n# Second\n\nBody.\n',
        },
      ]
    );

    const detail = getPlanDetail(root, '12--list-forms');
    expect(detail).toBeDefined();
    const first = detail!.tasks.find(t => t.id === 1)!;
    const second = detail!.tasks.find(t => t.id === 2)!;
    expect(first.dependencies).toEqual([]);
    expect(first.skills).toEqual(['typescript', 'vitest']);
    expect(second.dependencies).toEqual([1]);
    expect(second.skills).toEqual(['typescript', 'vitest']);
  });

  it('exposes complexity_score from task frontmatter when present', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    makePlan(
      root,
      '13--complexity-score',
      '---\nid: 13\nsummary: "Complexity score"\ncreated: 2026-05-29\n---\n# Complexity Score\n\nBody.\n',
      [
        {
          name: '01--scored.md',
          body: '---\nid: 1\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 3\nskills: [typescript]\n---\n# Scored Task\n\nBody.\n',
        },
        {
          name: '02--invalid-score.md',
          body: '---\nid: 2\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: "high"\nskills: [typescript]\n---\n# Invalid Score Task\n\nBody.\n',
        },
        {
          name: '03--zero-score.md',
          body: '---\nid: 3\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 0\nskills: [typescript]\n---\n# Zero Score Task\n\nBody.\n',
        },
        {
          name: '04--above-range-score.md',
          body: '---\nid: 4\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 42\nskills: [typescript]\n---\n# Above Range Score Task\n\nBody.\n',
        },
        {
          name: '05--decimal-score.md',
          body: '---\nid: 5\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 5.5\nskills: [typescript]\n---\n# Decimal Score Task\n\nBody.\n',
        },
        {
          name: '06--boundary-score.md',
          body: '---\nid: 6\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 10\nskills: [typescript]\n---\n# Boundary Score Task\n\nBody.\n',
        },
        {
          name: '07--comment-score.md',
          body: '---\nid: 7\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: 7 # with comment\nskills: [typescript]\n---\n# Comment Score Task\n\nBody.\n',
        },
        {
          name: '08--quoted-score.md',
          body: '---\nid: 8\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncomplexity_score: "8"\nskills: [typescript]\n---\n# Quoted Score Task\n\nBody.\n',
        },
      ]
    );

    const detail = getPlanDetail(root, '13--complexity-score');
    expect(detail).toBeDefined();
    const scored = detail!.tasks.find(t => t.id === 1)!;
    const invalid = detail!.tasks.find(t => t.id === 2)!;
    expect(scored.complexity_score).toBe(3);
    expect(invalid.complexity_score).toBeUndefined();
    // Out-of-range and non-integer scores are rejected by the parser.
    expect(detail!.tasks.find(t => t.id === 3)!.complexity_score).toBeUndefined();
    expect(detail!.tasks.find(t => t.id === 4)!.complexity_score).toBeUndefined();
    expect(detail!.tasks.find(t => t.id === 5)!.complexity_score).toBeUndefined();
    // Upper boundary (10) is accepted.
    expect(detail!.tasks.find(t => t.id === 6)!.complexity_score).toBe(10);
    expect(detail!.tasks.find(t => t.id === 7)!.complexity_score).toBe(7);
    expect(detail!.tasks.find(t => t.id === 8)!.complexity_score).toBe(8);
  });

  it('does not expose outside content through linked config files or directories', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    const outside = path.join(tmpRoot, 'outside');
    fs.mkdirSync(path.join(outside, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(outside, 'secret.yaml'), 'leaked: true\n', 'utf8');
    fs.writeFileSync(path.join(outside, 'templates', 'LEAK.md'), '# leaked\n', 'utf8');
    fs.mkdirSync(path.join(root, 'config', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'hooks', 'REAL.md'), '# real\n', 'utf8');
    fs.symlinkSync(path.join(outside, 'secret.yaml'), path.join(root, 'config', 'config.yaml'));
    fs.symlinkSync(path.join(outside, 'templates'), path.join(root, 'config', 'templates'), 'dir');

    const config = getConfig(root);
    expect(config.workspace).toBeNull();
    expect(config.templates).toEqual([]);
    expect(config.hooks.map(h => h.id)).toEqual(['REAL']);
    expect(config.hooks[0]!.content).toBe('# real\n');
    expect(config.hooks[0]!.relPath).toBe(path.join('config', 'hooks', 'REAL.md'));
  });

  it.skipIf(process.platform === 'win32')(
    'omits a FIFO at a hook path without blocking',
    () => {
      const root = path.join(tmpRoot, 'strikethroo');
      fs.mkdirSync(path.join(root, 'config', 'hooks'), { recursive: true });
      fs.writeFileSync(path.join(root, 'config', 'hooks', 'REAL.md'), '# real\n', 'utf8');
      execFileSync('mkfifo', [path.join(root, 'config', 'hooks', 'FIFO.md')]);
      const config = getConfig(root);
      expect(config.hooks.map(h => h.id)).toEqual(['REAL']);
    },
    5000
  );

  it('omits a directory at a hook path', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    fs.mkdirSync(path.join(root, 'config', 'hooks', 'DIR.md'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'hooks', 'DIR.md', 'inner.md'), '# inner\n', 'utf8');
    fs.writeFileSync(path.join(root, 'config', 'hooks', 'REAL.md'), '# real\n', 'utf8');
    const config = getConfig(root);
    expect(config.hooks.map(h => h.id)).toEqual(['REAL']);
  });

  it('returns undefined complexity_score for legacy fixture tasks without the field', () => {
    const detail = getPlanDetail(FIXTURE_ROOT, '83--workspace-data-layer');
    expect(detail).toBeDefined();
    expect(detail!.tasks.length).toBeGreaterThan(0);
    for (const task of detail!.tasks) {
      expect(task.complexity_score).toBeUndefined();
    }
  });

  it('reads phases from the blueprint section only, and infers them when no blueprint exists', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    const planHead = (id: number): string =>
      `---\nid: ${id}\nsummary: "Plan ${id}"\ncreated: 2026-10-07\n---\n# Plan ${id}\n\nBody.\n`;
    const taskFile = (id: number, deps: number[]): { name: string; body: string } => ({
      name: `0${id}--task.md`,
      body: `---\nid: ${id}\ngroup: "g"\ndependencies: [${deps.join(', ')}]\nstatus: "completed"\nskills: [typescript]\n---\n# Task ${id}\n`,
    });
    const tasks = [taskFile(1, []), taskFile(2, []), taskFile(3, [1, 2])];

    makePlan(root, '20--blueprint-only', planHead(20) + BLUEPRINT_SECTION, tasks);
    makePlan(
      root,
      '21--with-summary',
      planHead(21) + BLUEPRINT_SECTION + TRAILING_EXECUTION_SUMMARY,
      tasks
    );
    makePlan(root, '22--no-blueprint', planHead(22), tasks);

    const bare = getPlanDetail(root, '20--blueprint-only')!;
    const appended = getPlanDetail(root, '21--with-summary')!;
    expect(bare.phases.map(p => p.taskIds)).toEqual(EXPECTED_PHASE_TASK_IDS);
    expect(bare.phases.map(p => p.parallel)).toEqual([true, false]);
    // The appended `## Execution Summary` names tasks 01, 03, and 04 in bullets;
    // none of them may join the last phase.
    expect(appended.phases).toEqual(bare.phases);
    const summaries = getPlanSummaries(root);
    expect(summaries.find(p => p.id === 21)!.phaseCount).toBe(2);

    // No authored blueprint: phases come from dependencies, with `parallel` set.
    expect(getPlanDetail(root, '22--no-blueprint')!.phases).toEqual([
      { index: 1, taskIds: [1, 2], parallel: true },
      { index: 2, taskIds: [3], parallel: false },
    ]);
  });

  it('serves summaries byte-identical to the detail projection without building detail or reading config', () => {
    const root = path.join(tmpRoot, 'strikethroo');
    const head = (id: number, extra = ''): string =>
      `---\nid: ${id}\nsummary: "Edge case ${id}"\ncreated: 2026-10-07\n---\n# Plan ${id}\n\nBody.\n${extra}`;
    const task = (id: number, status: string, deps: number[] = []): string =>
      `---\nid: ${id}\ngroup: "g"\ndependencies: [${deps.join(', ')}]\nstatus: "${status}"\nskills: [typescript]\n---\n# Task ${id}\n\n## Objective\n\nDo it.\n`;
    const crlf = (s: string): string => s.replace(/\n/g, '\r\n');

    // Plans with missing, malformed, cyclic, CRLF, and blueprint-with-trailing-
    // summary tasks, in both trees. Two plans are unparsable and must be dropped
    // by both paths.
    makePlan(root, '301--no-tasks-dir', head(301));
    makePlan(root, '302--tasks-is-a-file', head(302));
    fs.writeFileSync(path.join(root, 'plans', '302--tasks-is-a-file', 'tasks'), 'not a dir\n');
    makePlan(root, '303--malformed-tasks', head(303), [
      { name: '01--ok.md', body: task(1, 'pending') },
      { name: '02--no-frontmatter.md', body: '# Just a heading\n\nNo frontmatter.\n' },
      { name: '03--unclosed.md', body: '---\nid: 3\nstatus: "completed"\n' },
      {
        name: '04--garbage-deps.md',
        body: '---\nid: 4\ndependencies: [abc, 1, 9]\nstatus: weird\nskills:\n  - a\n---\n# Four\n',
      },
      { name: '05--no-id.md', body: '---\nstatus: "completed"\ndependencies: []\n---\n# Five\n' },
      { name: 'notes.txt', body: 'not a task\n' },
    ]);
    makePlan(root, '304--blueprint', head(304, BLUEPRINT_SECTION + TRAILING_EXECUTION_SUMMARY), [
      { name: '01--a.md', body: task(1, 'completed') },
      { name: '02--b.md', body: task(2, 'completed') },
      { name: '03--c.md', body: task(3, 'completed', [1, 2]) },
    ]);
    makePlan(root, '305--cycle-deps', head(305), [
      { name: '01--a.md', body: task(1, 'in-progress', [2]) },
      { name: '02--b.md', body: task(2, 'pending', [1]) },
    ]);
    makePlan(root, '306--crlf', crlf(head(306)), [
      { name: '01--a.md', body: crlf(task(1, 'completed')) },
      { name: '02--b.md', body: crlf(task(2, 'pending', [1])) },
    ]);
    makePlan(root, 'bad--frontmatter', '---\nid: abc\n---\n# Bad\n', [
      { name: '01--a.md', body: task(1, 'pending') },
    ]);
    makePlan(root, '307--empty-plan-file', '');
    makePlan(root, '401--archived-no-tasks', head(401), [], 'archive');
    makePlan(
      root,
      '402--archived-malformed',
      head(402),
      [
        { name: '01--unclosed.md', body: '---\nid: 1\n' },
        { name: '02--ok.md', body: task(2, 'completed') },
      ],
      'archive'
    );

    // The detail path is the reference derivation; the summary must be its
    // projection, field for field and in key order, for every enumerated plan.
    const project = (d: PlanDetail): PlanSummary => ({
      id: d.id,
      name: d.name,
      summary: d.summary,
      created: d.created,
      state: d.state,
      done: d.done,
      total: d.total,
      phaseCount: d.phaseCount,
      archived: d.archived,
    });
    for (const fixture of [FIXTURE_ROOT, root]) {
      const viaDetail = getAllPlans(fixture).map(e => project(getPlanDetail(fixture, e.name)!));
      expect(JSON.stringify(getPlanSummaries(fixture))).toBe(JSON.stringify(viaDetail));
    }
    const names = getPlanSummaries(root).map(p => p.name);
    expect(names).toContain('303--malformed-tasks');
    expect(names).toContain('402--archived-malformed');
    expect(names).not.toContain('bad--frontmatter');
    expect(names).not.toContain('307--empty-plan-file');

    // The list path builds no sections or mermaid blocks and touches nothing
    // under config/. The detail and config paths do, which keeps the spies honest.
    const spies = [
      markdown.sectionBody,
      markdown.extractMermaidBlocks,
      safeFs.resolveContained,
      safeFs.readContainedFile,
    ].map(spy => vi.mocked(spy));
    spies.forEach(spy => spy.mockClear());
    getPlanSummaries(root);
    spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

    getPlanDetail(root, '304--blueprint');
    expect(markdown.sectionBody).toHaveBeenCalled();
    expect(markdown.extractMermaidBlocks).toHaveBeenCalled();
    expect(safeFs.readContainedFile).not.toHaveBeenCalled();
    getConfig(FIXTURE_ROOT);
    expect(safeFs.resolveContained).toHaveBeenCalled();
    expect(safeFs.readContainedFile).toHaveBeenCalled();
  });
});
