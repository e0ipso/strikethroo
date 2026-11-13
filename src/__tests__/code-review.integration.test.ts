/**
 * Review gate integration tests: skip reasons, diff scoping, and the compiled
 * result contract. Harness and diff dependencies are injected; the workspace
 * shape is real filesystem state from `makeReviewGateWorkspace`.
 */

import { SUPPORTED_HARNESSES } from '../types';
import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  _classify,
  _readCumulativeDiff,
  _resultLine,
  createFindingsGate,
  runReview,
  type FindingsGate,
  type ReviewDependencies,
  type ReviewResult,
} from '../skill-scripts/code-review';
import { buildReviewXml, FAKE_SHA, makeReviewGateWorkspace } from './fixtures/review-gate';
import { resolveExecutablePath } from '../skill-scripts/shared/executable-resolution';

const stubDeps = (overrides: Partial<ReviewDependencies> = {}): ReviewDependencies => ({
  discover: async () => ({ outcomes: [], reviewerCandidates: ['codex'] }),
  dispatch: async () => ({ kind: 'launched-success', exitCode: 0 }),
  readDiff: () => 'diff --git a/x.ts b/x.ts\n+something changed\n',
  validatorAvailable: () => true,
  ...overrides,
});

const oneFinding: FindingsGate = async () => ({
  kind: 'evaluated',
  counts: { total: 1, critical: 0, major: 1, minor: 0, info: 0, unlabelled: 0 },
  findingsFile: '/dev/null',
});

describe('code review gate — explicit opt-in', () => {
  it.each([
    ['missing file', 'absent'],
    ['blank file', ' \n\t\n'],
    ['comment-only file', '# no review preference\n'],
    ['absent section', 'harnesses: invalid-but-unrelated\n'],
    ['absent key', 'code_review: {}\n'],
    ['explicit false', 'code_review:\n  enabled: false\n'],
  ])('skips %s before any review work', async (_label, config) => {
    const ws = makeReviewGateWorkspace({ config });
    const dependencies = stubDeps({
      validatorAvailable: vi.fn(() => true),
      discover: vi.fn(async () => ({ outcomes: [], reviewerCandidates: [] })),
      readDiff: vi.fn(() => ''),
      dispatch: vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 })),
      evaluateFindings: vi.fn(oneFinding),
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      // The shipped mandate never authorizes review without a preference.
      // Disabled review also needs neither a current schema nor a plan.
      fs.writeFileSync(
        path.join(ws.strikethrooRoot, '.init-metadata.json'),
        JSON.stringify({ version: 'test', workspaceSchemaVersion: 1 })
      );
      fs.rmSync(ws.planFile);
      const result = await runReview(
        { plan: 'invalid', currentHarness: 'claude', startPath: ws.root },
        dependencies
      );
      expect(result).toMatchObject({
        kind: 'skipped',
        reason: 'review-disabled',
        action: 'continue',
      });
      expect(result.codeReview).toMatch(/^Skipped;/);
      expect(_classify(result).exitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      for (const dependency of Object.values(dependencies)) {
        expect(dependency).not.toHaveBeenCalled();
      }
      expect(fs.existsSync(path.join(ws.planDir, 'review'))).toBe(false);
    } finally {
      stderr.mockRestore();
      ws.cleanup();
    }
  });

  it.each([
    ['malformed YAML', 'code_review: ['],
    ['sequence document', '[]'],
    ['scalar document', 'false'],
    ['null document', 'null'],
    ['null section', 'code_review: null'],
    ['sequence section', 'code_review: []'],
    ['scalar section', 'code_review: false'],
    ['string preference', 'code_review: { enabled: "true" }'],
    ['null preference', 'code_review: { enabled: null }'],
    ['numeric preference', 'code_review: { enabled: 1 }'],
    ['sequence preference', 'code_review: { enabled: [] }'],
    ['mapping preference', 'code_review: { enabled: {} }'],
    ['unsupported owned key', 'code_review: { enabled: false, typo: true }'],
  ])('rejects %s before reviewer work', async (_label, config) => {
    const ws = makeReviewGateWorkspace({ config, baseCommit: FAKE_SHA });
    const dependencies = stubDeps({
      validatorAvailable: vi.fn(() => true),
      discover: vi.fn(async () => ({ outcomes: [], reviewerCandidates: [] })),
      readDiff: vi.fn(() => ''),
      dispatch: vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 })),
      evaluateFindings: vi.fn(oneFinding),
    });
    try {
      fs.writeFileSync(
        path.join(ws.strikethrooRoot, '.init-metadata.json'),
        JSON.stringify({ version: 'test', workspaceSchemaVersion: 1 })
      );
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        dependencies
      );
      expect(result).toMatchObject({ kind: 'infrastructure-failure', action: 'halt' });
      expect(result.detail).toContain('config.yaml');
      expect(_classify(result).exitCode).toBe(2);
      for (const dependency of Object.values(dependencies)) {
        expect(dependency).not.toHaveBeenCalled();
      }
    } finally {
      ws.cleanup();
    }
  });

  it('rejects an unreadable configuration instead of treating it as absent', async () => {
    const ws = makeReviewGateWorkspace();
    const dispatch = vi.fn(stubDeps().dispatch);
    try {
      fs.rmSync(ws.configFile);
      fs.mkdirSync(ws.configFile);
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ dispatch })
      );
      expect(result).toMatchObject({ kind: 'infrastructure-failure', action: 'halt' });
      expect(result.detail).toContain('could not be read');
      expect(_classify(result).exitCode).toBe(2);
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      ws.cleanup();
    }
  });

  it.skipIf(process.platform === 'win32').each([
    ['symlink', (configFile: string, outside: string) => fs.symlinkSync(outside, configFile)],
    ['FIFO', (configFile: string) => execFileSync('mkfifo', [configFile])],
  ])('rejects a %s configuration without following or blocking on it', async (_label, plant) => {
    const ws = makeReviewGateWorkspace();
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-outside-'));
    const outside = path.join(outsideDir, 'config.yaml');
    fs.writeFileSync(outside, 'code_review:\n  enabled: true\n');
    const dispatch = vi.fn(stubDeps().dispatch);
    try {
      fs.rmSync(ws.configFile);
      plant(ws.configFile, outside);
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ dispatch })
      );
      expect(result).toMatchObject({ kind: 'infrastructure-failure', action: 'halt' });
      expect(result.detail).toContain('could not be read');
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
      ws.cleanup();
    }
  });

  it.each([
    ['skips a disabled target from an enabled workspace', 'true', 'false'],
    ['reviews an enabled target from a disabled workspace', 'false', 'true'],
  ])('%s', async (_label, startEnabled, targetEnabled) => {
    const start = makeReviewGateWorkspace({ config: `code_review:\n  enabled: ${startEnabled}\n` });
    const target = makeReviewGateWorkspace({
      config: `code_review:\n  enabled: ${targetEnabled}\n`,
      baseCommit: FAKE_SHA,
    });
    const discover = vi.fn(async () => ({ outcomes: [], reviewerCandidates: [] }));
    try {
      const result = await runReview(
        { plan: target.planFile, currentHarness: 'claude', startPath: start.root },
        stubDeps({ discover })
      );
      if (targetEnabled === 'true') {
        expect(result).toMatchObject({ kind: 'skipped', reason: 'no-reviewer-candidate' });
        expect(discover).toHaveBeenCalledWith(
          expect.objectContaining({
            strikethrooRoot: target.strikethrooRoot,
            workspace: target.root,
          })
        );
      } else {
        expect(result).toMatchObject({ kind: 'skipped', reason: 'review-disabled' });
        expect(discover).not.toHaveBeenCalled();
      }
    } finally {
      start.cleanup();
      target.cleanup();
    }
  });

  it('keeps schema enforcement after explicit opt-in', async () => {
    const ws = makeReviewGateWorkspace();
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('schema check exited');
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const validatorAvailable = vi.fn(() => true);
    try {
      fs.writeFileSync(
        path.join(ws.strikethrooRoot, '.init-metadata.json'),
        JSON.stringify({ version: 'test', workspaceSchemaVersion: 1 })
      );
      await expect(
        runReview(
          { plan: '1', currentHarness: 'claude', startPath: ws.root },
          stubDeps({ validatorAvailable })
        )
      ).rejects.toThrow('schema check exited');
      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Workspace schema v1'));
      expect(validatorAvailable).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
      stderr.mockRestore();
      ws.cleanup();
    }
  });
});

describe('code review gate — fail-safe skips', () => {
  it.each([
    ['hook-absent', { hook: 'absent' as const }],
    ['hook-empty', { hook: '' }],
    ['xsd-absent', { xsd: 'absent' as const }],
    ['base-commit-absent', {}],
  ] as const)(
    'skips on %s: exit 0, the correct reason, and empty stderr',
    async (reason, options) => {
      const ws = makeReviewGateWorkspace(options);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      try {
        const result = await runReview(
          { plan: '1', currentHarness: 'claude', startPath: ws.root },
          stubDeps()
        );
        expect(result).toMatchObject({ kind: 'skipped', reason });
        expect(_classify(result).exitCode).toBe(0);
        expect(stderrSpy).not.toHaveBeenCalled();
      } finally {
        stderrSpy.mockRestore();
        ws.cleanup();
      }
    }
  );

  it('skips on no-reviewer-candidate: exit 0, the correct reason, and empty stderr', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({
          discover: async () => ({
            outcomes: SUPPORTED_HARNESSES.map(harness => ({
              harness,
              available: false,
              observedAt: 0,
              expiresAt: 100,
              source: 'cache' as const,
              reason: `${harness} auth or quota failure`,
            })),
            reviewerCandidates: [],
          }),
        })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'no-reviewer-candidate' });
      expect(result.codeReview).toMatch(/^Failed;/);
      for (const harness of SUPPORTED_HARNESSES.filter(harness => harness !== 'claude')) {
        expect(result.detail).toContain(
          `${harness}: ${harness} auth or quota failure (cached readiness result)`
        );
        expect(result.codeReview).toContain(`${harness} auth or quota failure`);
      }
      expect(result.detail).not.toContain('claude auth or quota failure');
      expect(_classify(result).exitCode).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
      ws.cleanup();
    }
  });

  /** An empty diff would otherwise come back as a clean review. */
  it('skips on empty-diff without dispatching a reviewer', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let dispatched = false;
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({
          readDiff: () => '   \n',
          dispatch: async () => {
            dispatched = true;
            return { kind: 'launched-success', exitCode: 0 };
          },
        })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'empty-diff' });
      expect(_classify(result).exitCode).toBe(0);
      expect(dispatched).toBe(false);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
      ws.cleanup();
    }
  });

  it('reaches evaluation (no skip) once every input is present, proving the skip ladder is order-sensitive not vacuous', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: oneFinding })
      );
      expect(result.kind).toBe('reviewed');
    } finally {
      ws.cleanup();
    }
  });
});

describe('code review gate — the gate reports, it does not judge', () => {
  it('dispatches the reviewer with the exact invocation proven during discovery', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    try {
      await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({
          discover: async () => ({
            outcomes: [],
            reviewerCandidates: ['codex'],
            reviewerInvocations: {
              codex: {
                cliArgs: ['--sandbox', 'workspace-write'],
              },
            },
          }),
          dispatch,
          evaluateFindings: oneFinding,
        })
      );

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          harness: 'codex',
          cliArgs: ['--sandbox', 'workspace-write'],
        })
      );
    } finally {
      ws.cleanup();
    }
  });

  it('records a clean review as recorded, not as an absence', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const noFindings: FindingsGate = async () => ({
        kind: 'evaluated',
        counts: { total: 0, critical: 0, major: 0, minor: 0, info: 0, unlabelled: 0 },
        findingsFile: '/dev/null',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: noFindings })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
        detail: expect.stringContaining('no findings'),
        counts: { total: 0 },
        codeReview: 'Pass; Harness: codex; model: CLI-selected (exact model unknown). Findings: 0.',
      });
      expect(_classify(result).exitCode).toBe(0);
    } finally {
      ws.cleanup();
    }
  });

  it('reports findings without acting on them, whatever their labels', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      // Findings are counted and named, then handed to the implementer to
      // judge. Their labels move nothing here.
      const loud: FindingsGate = async () => ({
        kind: 'evaluated',
        counts: { total: 3, critical: 2, major: 0, minor: 0, info: 0, unlabelled: 1 },
        findingsFile: '/tmp/findings.json',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: loud })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
        detail: expect.stringContaining('2 critical, 1 unlabelled'),
        counts: { total: 3, critical: 2, unlabelled: 1 },
      });
      // Findings never change the exit code: the gate does not judge them.
      expect(_classify(result).exitCode).toBe(0);
    } finally {
      ws.cleanup();
    }
  });

  it('exits 1 when the findings were never certified', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const uncertified: FindingsGate = async () => ({
        kind: 'schema-invalid',
        detail: 'review.xml does not validate.',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: uncertified })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-failed' },
        detail: expect.stringContaining('does not validate'),
      });
      expect(result).not.toHaveProperty('counts');
      expect(_classify(result).exitCode).toBe(1);
    } finally {
      ws.cleanup();
    }
  });
});

describe('cumulative diff scope: generated and vendored files', () => {
  let repo: string;

  const git = (args: string) =>
    execSync(`git ${args}`, { cwd: repo, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'st-diff-scope-'));
    git('init -q');
    git('config user.email test@example.com');
    git('config user.name Test');
    fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
    git('add -A');
    git('commit -q -m seed');
  });

  afterEach(() => fs.rmSync(repo, { recursive: true, force: true }));

  const baseSha = () => git('rev-parse HEAD').trim();

  it('drops generated and vendored paths while keeping real source', () => {
    const base = baseSha();
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'out/*.cjs linguist-generated=true\nvendor/*.xsd linguist-vendored=true\n'
    );
    fs.mkdirSync(path.join(repo, 'out'));
    fs.mkdirSync(path.join(repo, 'vendor'));
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'GENERATED_BUNDLE_CONTENT\n');
    fs.writeFileSync(path.join(repo, 'vendor/schema.xsd'), 'VENDORED_SCHEMA_CONTENT\n');
    git('add -A');
    git('commit -q -m change');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('src.ts');
    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('GENERATED_BUNDLE_CONTENT');
    expect(diff).not.toContain('VENDORED_SCHEMA_CONTENT');
    expect(diff).not.toContain('out/bundle.cjs');
    expect(diff).not.toContain('vendor/schema.xsd');
  });

  it('excludes an uncommitted edit to a generated file, which never reaches the index', () => {
    fs.writeFileSync(path.join(repo, '.gitattributes'), 'out/*.cjs linguist-generated=true\n');
    fs.mkdirSync(path.join(repo, 'out'));
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'first\n');
    git('add -A');
    git('commit -q -m add-bundle');
    const base = baseSha();

    // The steady state of a local rebuild: tracked build output dirtied, never committed.
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'REBUILT_OUTPUT\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 2;\n');
    git('add src.ts');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 2;');
    expect(diff).not.toContain('REBUILT_OUTPUT');
  });

  /**
   * The scope must not depend on anything having committed. `POST_PHASE.md` is a
   * user-editable hook the gate does not own, and a repository whose pre-commit
   * hook runs the test suite cannot commit between phases at all — so a scope
   * that only sees tracked files would silently shrink to nothing on exactly the
   * plans that add the most new code.
   */
  it('includes an untracked file the plan added but nothing committed', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'brand-new.ts'), 'export const NEW_MODULE = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('brand-new.ts');
    expect(diff).toContain('export const NEW_MODULE = 1;');
    // Rendered as a conventional add-diff, not with `--no-index`'s 1/ 2/ prefixes.
    expect(diff).toContain('diff --git a/brand-new.ts b/brand-new.ts');
    expect(diff).toContain('new file mode');
    expect(diff).not.toContain('1/brand-new.ts');
  });

  it('reports tracked and untracked changes in one diff', () => {
    fs.writeFileSync(path.join(repo, 'existing.ts'), 'export const existing = 1;\n');
    git('add -A');
    git('commit -q -m existing');
    const base = baseSha();

    fs.writeFileSync(path.join(repo, 'existing.ts'), 'export const existing = 2;\n');
    fs.writeFileSync(path.join(repo, 'added.ts'), 'export const ADDED = 3;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const existing = 2;');
    expect(diff).toContain('export const ADDED = 3;');
  });

  it('leaves ignored files out, so the gate never reviews its own output', () => {
    fs.writeFileSync(path.join(repo, '.gitignore'), 'review/\n');
    git('add -A');
    git('commit -q -m ignore');
    const base = baseSha();
    fs.mkdirSync(path.join(repo, 'review'));
    fs.writeFileSync(path.join(repo, 'review/review.xml'), 'PRIOR_REVIEW_FINDINGS\n');
    fs.writeFileSync(path.join(repo, 'real.ts'), 'export const real = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('PRIOR_REVIEW_FINDINGS');
  });

  it('drops untracked paths marked generated, as it does tracked ones', () => {
    fs.writeFileSync(path.join(repo, '.gitattributes'), 'out/*.cjs linguist-generated=true\n');
    git('add -A');
    git('commit -q -m attrs');
    const base = baseSha();
    fs.mkdirSync(path.join(repo, 'out'));
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'GENERATED_BUNDLE_CONTENT\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('GENERATED_BUNDLE_CONTENT');
  });

  /**
   * `check-attr -z` reports a marked path as `set` (bare `out/* linguist-generated`),
   * `true` (`=true`), or whatever value was written; GitHub's linguist treats every
   * one except `false` as marked. The bare form is the one that read as unmarked.
   */
  it('drops the bare `set` form as well as `=true`, and keeps unset and `=false` paths', () => {
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'out/* linguist-generated\nvendor/* linguist-vendored=true\nsrc/* -linguist-generated\nkept/* linguist-generated=false\n'
    );
    for (const dir of ['out', 'vendor', 'src', 'kept']) fs.mkdirSync(path.join(repo, dir));
    fs.writeFileSync(path.join(repo, 'out/gen.cjs'), 'original\n');
    fs.writeFileSync(path.join(repo, 'vendor/lib.xsd'), 'original\n');
    fs.writeFileSync(path.join(repo, 'src/real.ts'), 'original\n');
    fs.writeFileSync(path.join(repo, 'kept/k.ts'), 'original\n');
    git('add -A');
    git('commit -q -m attrs');
    const base = baseSha();

    fs.writeFileSync(path.join(repo, 'out/gen.cjs'), 'BARE_SET_GENERATED\n');
    fs.writeFileSync(path.join(repo, 'out/new.cjs'), 'BARE_SET_UNTRACKED\n');
    fs.writeFileSync(path.join(repo, 'vendor/lib.xsd'), 'EXPLICIT_TRUE_VENDORED\n');
    fs.writeFileSync(path.join(repo, 'src/real.ts'), 'UNSET_SOURCE\n');
    fs.writeFileSync(path.join(repo, 'kept/k.ts'), 'EXPLICIT_FALSE_KEPT\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).not.toBeNull();
    expect(diff).not.toContain('BARE_SET_GENERATED');
    expect(diff).not.toContain('BARE_SET_UNTRACKED');
    expect(diff).not.toContain('EXPLICIT_TRUE_VENDORED');
    expect(diff).toContain('UNSET_SOURCE');
    expect(diff).toContain('EXPLICIT_FALSE_KEPT');
  });

  it('summarizes an untracked binary instead of inlining it', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'blob.bin'), Buffer.from([0, 1, 2, 0, 3]));

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('blob.bin');
    expect(diff).toContain('Binary files');
  });

  it('returns an empty diff when nothing changed at all', () => {
    expect(_readCumulativeDiff(repo, baseSha())?.trim()).toBe('');
  });

  it('keeps everything when the repository marks nothing generated', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(repo, 'b.cjs'), 'export const b = 2;\n');
    git('add -A');
    git('commit -q -m plain');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const a = 1;');
    expect(diff).toContain('export const b = 2;');
  });

  /**
   * A generated file moved between two generated locations must vanish from the
   * scope entirely. Git's rename detection lists only the destination under
   * `--name-only`, so an exclusion list built from that listing covers one side;
   * excluding the destination then breaks the rename pairing and the source
   * re-materializes as a full deletion of generated content.
   */
  it('drops both sides of a generated file renamed across generated trees', () => {
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'out-a/*.cjs linguist-generated=true\nout-b/*.cjs linguist-generated=true\n'
    );
    fs.mkdirSync(path.join(repo, 'out-a'));
    fs.writeFileSync(path.join(repo, 'out-a/bundle.cjs'), 'RELOCATED_GENERATED_CONTENT\n');
    git('add -A');
    git('commit -q -m generated-at-old-home');
    const base = baseSha();

    fs.mkdirSync(path.join(repo, 'out-b'));
    git('mv out-a/bundle.cjs out-b/bundle.cjs');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');
    git('add src.ts');
    git('commit -q -m relocate');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('RELOCATED_GENERATED_CONTENT');
    expect(diff).not.toContain('out-a/bundle.cjs');
    expect(diff).not.toContain('out-b/bundle.cjs');
  });

  /**
   * The scope deliberately has no size cap, so a diff larger than execSync's
   * default 1 MiB buffer must come back whole instead of collapsing into the
   * `null` the caller reports as an infrastructure failure — and an untracked
   * file past the same limit must not silently drop out of the scope.
   */
  it('survives a scope larger than one megabyte, tracked and untracked', () => {
    const base = baseSha();
    const bulk = Array.from({ length: 40000 }, (_, i) => `export const line${i} = ${i};`).join(
      '\n'
    );
    fs.writeFileSync(path.join(repo, 'tracked-big.ts'), `${bulk}\nexport const TRACKED_END = 1;\n`);
    git('add tracked-big.ts');
    git('commit -q -m big');
    fs.writeFileSync(
      path.join(repo, 'untracked-big.ts'),
      `${bulk}\nexport const UNTRACKED_END = 2;\n`
    );

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).not.toBeNull();
    expect(diff).toContain('TRACKED_END');
    expect(diff).toContain('UNTRACKED_END');
  });
});

/** `xmllint` is a soft dependency: absence skips cleanly before dispatch. */
describe('code review gate — xmllint is a soft dependency', () => {
  it('skips with validator-absent: exit 0, empty stderr, no reviewer dispatched', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ dispatch, validatorAvailable: () => false })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'validator-absent' });
      expect(_classify(result).exitCode).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
      // The point of checking before dispatch: no external harness is spent on
      // a review that could not have been certified.
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('names an actionable fix rather than failing opaquely', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const result = await runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ validatorAvailable: () => false })
    );
    expect(result).toMatchObject({ kind: 'skipped' });
    const detail = (result as { detail: string }).detail;
    expect(detail).toContain('xmllint');
    expect(detail).toContain('libxml2');
  });

  it('runs the review normally when the validator is available', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const result = await runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ dispatch, validatorAvailable: () => true })
    );
    expect(result).not.toMatchObject({ reason: 'validator-absent' });
    expect(dispatch).toHaveBeenCalled();
  });

  /**
   * The default probe is the shared resolver, so a file named `xmllint` that
   * cannot execute is an absent validator. `PATH` is replaced, never prepended,
   * so nothing can fall through to a real binary.
   */
  it('probes xmllint through the shared resolver, so execute permission decides', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-xmllint-probe-'));
    const xmllint = path.join(bin, 'xmllint');
    fs.writeFileSync(xmllint, `#!${process.execPath}\nprocess.exit(0);\n`, { mode: 0o644 });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const { validatorAvailable: _stubbed, ...realProbe } = stubDeps({ dispatch });
    const run = () =>
      runReview({ plan: '1', currentHarness: 'claude', startPath: ws.root }, realProbe);
    const originalPath = process.env.PATH;
    try {
      process.env.PATH = bin;
      expect(await run()).toMatchObject({ kind: 'skipped', reason: 'validator-absent' });
      expect(dispatch).not.toHaveBeenCalled();
      fs.chmodSync(xmllint, 0o755);
      expect(await run()).not.toMatchObject({ reason: 'validator-absent' });
      expect(dispatch).toHaveBeenCalled();
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
      fs.rmSync(bin, { recursive: true, force: true });
      ws.cleanup();
    }
  });
});

/**
 * Stdout is the only delivery channel: the reviewer prints its findings document
 * between this dispatch's delimiters, and the mechanism — never the reviewer —
 * writes it to the canonical path. There is no on-disk channel to prefer, so a
 * review certifies from a transcript or not at all.
 *
 * These cases deliberately do **not** inject `evaluateFindings`. Extraction lives
 * inside `createFindingsGate`, so the override every suite above uses is
 * precisely what would leave it untested. The real gate runs here, against the
 * real vendored XSD through the real `xmllint` — which is what proves a delivered
 * document is held to the schema, and that an undelivered one degrades to a
 * uncertified review rather than a clean one.
 */
describe('code review gate — single-channel stdout delivery', () => {
  const reviewDirOf = (ws: ReturnType<typeof makeReviewGateWorkspace>) =>
    path.join(ws.planDir, 'review');

  const TOKEN_PATTERN = /<<<BEGIN REVIEW XML ([0-9a-f]+)>>>/;

  const delimited = (token: string, xml: string) =>
    `<<<BEGIN REVIEW XML ${token}>>>\n${xml}\n<<<END REVIEW XML ${token}>>>\n`;

  /**
   * `runReview` mints the collision token internally, so a stub cannot know
   * it in advance — it is read back out of the prompt the stub receives. The
   * regex doubles as an assertion that the prompt carries the delimiters at all:
   * a drift between the prompt and the extractor would silently disable
   * delivery, and every case here would stop finding a token.
   */
  const emitting = (xml: string) => {
    let seen = '';
    const dispatch: ReviewDependencies['dispatch'] = async request => {
      seen = request.prompt;
      const token = TOKEN_PATTERN.exec(request.prompt)?.[1];
      if (token === undefined) return { kind: 'launched-success', exitCode: 0 };
      return {
        kind: 'launched-success',
        exitCode: 0,
        stdout: `some progress chatter\n${delimited(token, xml)}`,
      };
    };
    return { dispatch, prompt: () => seen };
  };

  const runGate = (ws: ReturnType<typeof makeReviewGateWorkspace>, dispatch: unknown) =>
    runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ dispatch: dispatch as ReviewDependencies['dispatch'] })
    );

  it('certifies a review from a document the reviewer only printed, and writes it to the canonical path', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
    const { dispatch, prompt } = emitting(xml);
    // `vi.spyOn` calls through, so the reporter's own writes are unaffected; the
    // assertion below is only that no reviewer text is among them.
    const stdoutSpy = vi.spyOn(process.stdout, 'write');
    try {
      const result = await runGate(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
      });
      expect(_classify(result).exitCode).toBe(0);
      const { reviewFile } = result as { reviewFile: string };
      expect(fs.readFileSync(reviewFile, 'utf8').trim()).toBe(xml.trim());
      expect(prompt()).toMatch(TOKEN_PATTERN);
      // `findings.json` is the review's own record that it was evaluated, not just
      // that a document arrived.
      const findingsRecord: unknown = JSON.parse(
        fs.readFileSync(path.join(reviewDirOf(ws), 'findings.json'), 'utf8')
      );
      expect(findingsRecord).toMatchObject({ status: 'evaluated' });

      // Capture is a channel back into this mechanism, not a passthrough. The
      // launcher tees the child's output to stderr; nothing reviewer-shaped may
      // reach this process's stdout, which carries only `emit`'s single JSON
      // line — and `emit` is not reached from `runReview`.
      for (const [chunk] of stdoutSpy.mock.calls) {
        expect(String(chunk)).not.toContain('src/x.ts');
        expect(String(chunk)).not.toContain('REVIEW XML');
      }
    } finally {
      stdoutSpy.mockRestore();
      ws.cleanup();
    }
  });

  it('extracts the answer from a noisy harness transcript: ANSI escapes, chatter, an echoed instruction block and a trailing summary', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    // `<![CDATA[` is in the payload on purpose. The ANSI pattern requires a
    // leading ESC precisely so it cannot eat the `[C` of that sequence; a payload
    // without one would never exercise that constraint.
    const xml = buildReviewXml([
      {
        file: 'src/parse.ts',
        severity: 'minor',
        confidence: 'low',
        rawInner:
          '<body><![CDATA[Index math on buf[Cursor] is off by one in the escape branch.]]></body>' +
          '<category>bug</category>',
      },
    ]);
    expect(xml).toContain('<![CDATA[');

    const dim = '\u001b[2m';
    const reset = '\u001b[0m';
    // The prompt's own placeholder, verbatim: the reviewer restating its delivery
    // instructions is the realistic false positive, and it is a token-bearing
    // region that must never be certified.
    const placeholder =
      '... the complete findings document, beginning with its XML declaration ...';
    const decorated = xml
      .replace('<review', `${dim}<review`)
      .replace('</review>', `</review>${reset}`);

    const dispatch: ReviewDependencies['dispatch'] = async request => {
      const token = TOKEN_PATTERN.exec(request.prompt)?.[1];
      if (token === undefined) return { kind: 'launched-success', exitCode: 0 };
      const block = (body: string) =>
        `<<<BEGIN REVIEW XML ${token}>>>\n${body}\n<<<END REVIEW XML ${token}>>>`;
      return {
        kind: 'launched-success',
        exitCode: 0,
        stdout: [
          `${dim}Reading src/parse.ts${reset}`,
          `${dim}thinking…${reset} weighing the severity of the escape branch`,
          'tool: shell(git diff --stat) -> 4 files changed, 118 insertions(+)',
          // Echo before the answer: defeats a naive first-region scan.
          block(placeholder),
          'restating the delivery format above; now emitting the real document',
          // The answer, carrying escapes inside the delimited region itself.
          block(decorated),
          // Echo after the answer: the LAST token-bearing region in the transcript
          // is the placeholder, so certifying this document requires the anti-echo
          // guard to reject this region *and* the backwards scan to keep walking
          // past it. Delete either one and the review stops certifying.
          block(placeholder),
          `${dim}tokens used: 41,233 · duration 92s${reset}`,
          '',
        ].join('\n'),
      };
    };

    try {
      const result = await runGate(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
      });
      expect(_classify(result).exitCode).toBe(0);
      // Byte equality with the payload is the whole assertion: the chatter, the
      // escapes — including the ones inside the region — and both echoed blocks
      // were excluded from what was written and validated.
      const written = fs.readFileSync((result as { reviewFile: string }).reviewFile, 'utf8');
      expect(written.trim()).toBe(xml.trim());
      expect(written).toContain('<![CDATA[');
      expect(written).not.toContain('\u001b');
      expect(written).not.toContain('tokens used');
      expect(written).not.toContain('beginning with its XML declaration');
    } finally {
      ws.cleanup();
    }
  });

  it('holds a delivered document to the same XSD as any other: schema-invalid, never evaluated', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const { dispatch } = emitting(
      '<?xml version="1.0"?><review xmlns="urn:self-review:v2"><nonsense/></review>'
    );
    try {
      const result = await runGate(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-failed' },
        detail: expect.stringContaining('does not validate'),
      });
      expect(_classify(result).exitCode).toBe(1);
    } finally {
      ws.cleanup();
    }
  });

  it('never reads an undelivered document as a clean review, whether nothing was printed or the prompt was echoed back', async () => {
    const silent: ReviewDependencies['dispatch'] = async () => ({
      kind: 'launched-success',
      exitCode: 0,
    });
    // The prompt itself carries the delimiters around a prose placeholder, so
    // echoing it back is the realistic false-positive: the region matches but
    // does not open an XML document, and must be rejected.
    const echoing: ReviewDependencies['dispatch'] = async request => ({
      kind: 'launched-success',
      exitCode: 0,
      stdout: request.prompt,
    });

    for (const dispatch of [silent, echoing]) {
      const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
      try {
        const result = await runGate(ws, dispatch);

        expect(result).toMatchObject({
          kind: 'reviewed',
          verdict: { kind: 'review-failed' },
          detail: expect.stringContaining('no complete findings document'),
        });
        // Delivery diagnostics stay in `findings.json`.
        expect(result).not.toHaveProperty('findingsGate');
        expect(_classify(result).exitCode).toBe(1);
      } finally {
        ws.cleanup();
      }
    }
  });

  it('removes only the canonical review.xml before dispatch, leaving unrelated review artifacts intact', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const reviewDir = reviewDirOf(ws);
    fs.mkdirSync(reviewDir, { recursive: true });
    // The stale document names a different file from the fresh one, so if it
    // survived, the recorded findings would describe the wrong file entirely.
    const stale = buildReviewXml([{ file: 'stale.ts', severity: 'critical', confidence: 'high' }]);
    const custom = buildReviewXml([{ file: 'custom.ts', severity: 'minor', confidence: 'low' }]);
    const fresh = buildReviewXml([{ file: 'fresh.ts', severity: 'minor', confidence: 'low' }]);
    fs.writeFileSync(path.join(reviewDir, 'review.xml'), stale, 'utf8');
    fs.writeFileSync(path.join(reviewDir, 'custom-review.xml'), custom, 'utf8');
    fs.writeFileSync(path.join(reviewDir, 'findings.json'), '{"seeded":true}\n', 'utf8');

    const { dispatch } = emitting(fresh);
    try {
      const result = await runGate(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
      });
      expect(fs.readFileSync(path.join(reviewDir, 'review.xml'), 'utf8').trim()).toBe(fresh.trim());
      // `custom-review.xml` is the unrelated artifact this asserts non-deletion
      // on, byte for byte: the removal must target the exact canonical path and
      // never glob for XML or follow a custom output name. `findings.json` is
      // only asserted to still exist, because the gate rewrites it for the
      // current review by design — its seeded content is *expected* to be gone,
      // so it cannot witness non-deletion.
      expect(fs.readFileSync(path.join(reviewDir, 'custom-review.xml'), 'utf8')).toBe(custom);
      expect(fs.existsSync(path.join(reviewDir, 'findings.json'))).toBe(true);
      const findingsRecord = fs.readFileSync(path.join(reviewDir, 'findings.json'), 'utf8');
      expect(JSON.parse(findingsRecord)).toMatchObject({
        status: 'evaluated',
        counts: { total: 1, minor: 1, critical: 0 },
      });
      expect(JSON.parse(findingsRecord).findings).toEqual([
        {
          file: 'fresh.ts',
          location: null,
          severity: 'minor',
          confidence: 'low',
          category: 'bug',
          summary: 'A finding.',
        },
      ]);
    } finally {
      ws.cleanup();
    }
  });

  /** The transcript is the only diagnostic when no document was delivered. */
  it('keeps the reviewer transcript on a review that did not certify, and only then', async () => {
    const transcriptOf = (ws: ReturnType<typeof makeReviewGateWorkspace>) =>
      path.join(reviewDirOf(ws), 'reviewer-output.txt');
    // No token-bearing region anywhere, so the review cannot certify from it.
    const noise = 'reviewing…\ntool: shell(git status)\nI could not read the repository.\n';

    const undelivered = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runGate(undelivered, async () => ({
        kind: 'launched-success',
        exitCode: 0,
        stdout: noise,
      }));
      expect(result).toMatchObject({ kind: 'reviewed', verdict: { kind: 'review-failed' } });
      expect(fs.readFileSync(transcriptOf(undelivered), 'utf8')).toBe(noise);
    } finally {
      undelivered.cleanup();
    }

    // The darkest case: this branch returns before the gate runs, so without the
    // write here a non-zero reviewer would leave the review directory empty.
    const crashed = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runGate(crashed, async () => ({
        kind: 'launched-failure',
        exitCode: 3,
        stdout: noise,
      }));
      expect(result).toMatchObject({ kind: 'launched-failure', exitCode: 3 });
      expect(fs.readFileSync(transcriptOf(crashed), 'utf8')).toBe(noise);
    } finally {
      crashed.cleanup();
    }

    const certified = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
      const { dispatch } = emitting(xml);
      const result = await runGate(certified, dispatch);
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded' },
      });
      expect(fs.existsSync(transcriptOf(certified))).toBe(false);
    } finally {
      certified.cleanup();
    }
  });

  /** A stale transcript beside a certified review.xml would read as a failure. */
  it("drops a previous attempt's transcript when the review is re-run and certifies", async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const transcript = path.join(reviewDirOf(ws), 'reviewer-output.txt');
    try {
      const failed = await runGate(ws, async () => ({
        kind: 'launched-success',
        exitCode: 0,
        stdout: 'I could not read the repository.\n',
      }));
      expect(failed).toMatchObject({ kind: 'reviewed', verdict: { kind: 'review-failed' } });
      expect(fs.existsSync(transcript)).toBe(true);

      const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
      const { dispatch } = emitting(xml);
      const rerun = await runGate(ws, dispatch);

      expect(rerun).toMatchObject({ kind: 'reviewed', verdict: { kind: 'review-recorded' } });
      expect(fs.existsSync(transcript)).toBe(false);
    } finally {
      ws.cleanup();
    }
  });
});

/**
 * Every variant carries `action` and `detail`, and `action === 'continue'` is
 * exactly exit code 0.
 */
describe('code review gate — the compiled result contract', () => {
  const certifying: FindingsGate = async () => ({
    kind: 'evaluated',
    counts: { total: 2, critical: 0, major: 1, minor: 1, info: 0, unlabelled: 0 },
    findingsFile: '/tmp/findings.json',
  });
  const uncertifying: FindingsGate = async () => ({
    kind: 'validator-unavailable',
    detail: 'xmllint could not be run.',
  });

  /** Each variant is produced by a real run, never hand-built as a literal. */
  const variants: [
    label: string,
    produce: () => Promise<{ result: ReviewResult; cleanup: () => void }>,
    expected: { kind: string; action: 'continue' | 'halt'; exitCode: number },
  ][] = [
    [
      'certified review',
      async () => {
        const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
        return {
          result: await runReview(
            { plan: '1', currentHarness: 'claude', startPath: ws.root },
            stubDeps({ evaluateFindings: certifying })
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'reviewed', action: 'continue', exitCode: 0 },
    ],
    [
      'uncertified review',
      async () => {
        const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
        return {
          result: await runReview(
            { plan: '1', currentHarness: 'claude', startPath: ws.root },
            stubDeps({ evaluateFindings: uncertifying })
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'reviewed', action: 'halt', exitCode: 1 },
    ],
    [
      'skipped gate',
      async () => {
        const ws = makeReviewGateWorkspace({ hook: 'absent' });
        return {
          result: await runReview(
            { plan: '1', currentHarness: 'claude', startPath: ws.root },
            stubDeps()
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'skipped', action: 'continue', exitCode: 0 },
    ],
    [
      'pre-launch fallback',
      async () => {
        const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
        return {
          result: await runReview(
            { plan: '1', currentHarness: 'claude', startPath: ws.root },
            stubDeps({
              dispatch: async () => ({
                kind: 'fallback',
                reason: 'executable-unavailable',
                detail: 'The codex executable is not on PATH.',
              }),
            })
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'fallback', action: 'continue', exitCode: 0 },
    ],
    [
      'launched failure',
      async () => {
        const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
        return {
          result: await runReview(
            { plan: '1', currentHarness: 'claude', startPath: ws.root },
            stubDeps({ dispatch: async () => ({ kind: 'launched-failure', exitCode: 3 }) })
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'launched-failure', action: 'halt', exitCode: 1 },
    ],
    [
      'infrastructure failure',
      async () => {
        const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
        return {
          result: await runReview(
            { plan: '404', currentHarness: 'claude', startPath: ws.root },
            stubDeps()
          ),
          cleanup: ws.cleanup,
        };
      },
      { kind: 'infrastructure-failure', action: 'halt', exitCode: 2 },
    ],
  ];

  it.each(variants)(
    'compiles %s into one action and one exit code',
    async (_label, produce, expected) => {
      const { result, cleanup } = await produce();
      try {
        expect(result.kind).toBe(expected.kind);
        expect(result.action).toBe(expected.action);
        expect(result.detail.length).toBeGreaterThan(0);
        expect(_classify(result).exitCode).toBe(expected.exitCode);
        // The invariant the orchestrator depends on, asserted on every variant
        // rather than on the two that happen to be interesting.
        expect(result.action === 'continue').toBe(_classify(result).exitCode === 0);
      } finally {
        cleanup();
      }
    }
  );

  it.each(variants)('emits %s as exactly one JSON line', async (_label, produce) => {
    const { result, cleanup } = await produce();
    try {
      const line = _resultLine(result);
      expect(line.endsWith('\n')).toBe(true);
      expect(line.trimEnd()).not.toContain('\n');
      expect(JSON.parse(line)).toEqual(result);
    } finally {
      cleanup();
    }
  });

  it('emits the exact reviewed shapes and exposes counts only after certification', async () => {
    const certified = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const uncertified = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const good = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: certified.root },
        stubDeps({ evaluateFindings: certifying })
      );
      const bad = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: uncertified.root },
        stubDeps({ evaluateFindings: uncertifying })
      );

      expect(good).toEqual({
        codeReview:
          'Address; Harness: codex; model: CLI-selected (exact model unknown). Findings: 2.',
        kind: 'reviewed',
        harness: 'codex',
        baseCommit: FAKE_SHA,
        reviewFile: path.join(certified.planDir, 'review', 'review.xml'),
        verdict: { kind: 'review-recorded' },
        counts: { total: 2, critical: 0, major: 1, minor: 1, info: 0, unlabelled: 0 },
        action: 'continue',
        detail: expect.stringContaining('/tmp/findings.json'),
      });
      expect(bad).toEqual({
        codeReview:
          'Failed; Harness: codex; model: CLI-selected (exact model unknown). xmllint could not be run.',
        kind: 'reviewed',
        harness: 'codex',
        baseCommit: FAKE_SHA,
        reviewFile: path.join(uncertified.planDir, 'review', 'review.xml'),
        verdict: { kind: 'review-failed' },
        action: 'halt',
        detail: 'xmllint could not be run.',
      });
      // Delivery diagnostics stay in `findings.json`.
      for (const result of [good, bad]) {
        expect(result).not.toHaveProperty('findingsGate');
        expect(result).not.toHaveProperty('reviewFilePresent');
      }
    } finally {
      certified.cleanup();
      uncertified.cleanup();
    }
  });
});

describe('code review gate — certified counts come from the validated XML', () => {
  it('preserves the findings objects with native namespace and entity semantics', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const token = 'abc123';
    const xml =
      '<?xml version="1.0"?><review xmlns="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z">' +
      '<file path="src/real.ts" xmlns:path="urn:unrelated" change-type="modified" viewed="true">' +
      '<comment severity="critical" xmlns:severity="urn:unrelated">' +
      '<body>Keep &#38;amp; literally.</body><category>bug</category></comment></file></review>';
    const reviewFile = path.join(ws.planDir, 'review', 'review.xml');
    try {
      const outcome = await createFindingsGate()({
        reviewFile,
        xsdFile: ws.xsdFile,
        planDir: ws.planDir,
        reviewerStdout: `<<<BEGIN REVIEW XML ${token}>>>\n${xml}\n<<<END REVIEW XML ${token}>>>`,
        deliveryToken: token,
      });
      const counts = { total: 1, critical: 1, major: 0, minor: 0, info: 0, unlabelled: 0 };
      expect(outcome).toMatchObject({ kind: 'evaluated', counts });
      expect(fs.readFileSync(reviewFile, 'utf8')).toBe(`${xml}\n`);
      expect(
        JSON.parse(fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8'))
      ).toEqual({
        reviewFile,
        xsdFile: ws.xsdFile,
        status: 'evaluated',
        counts,
        findings: [
          {
            file: 'src/real.ts',
            location: null,
            severity: 'critical',
            confidence: null,
            category: 'bug',
            summary: 'Keep &amp; literally.',
          },
        ],
      });
    } finally {
      ws.cleanup();
    }
  });

  it.each([false, true])(
    'projects Unicode, delimiter text, locations and empty labels across batches (prefixed %s)',
    async prefixed => {
      const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
      const body = `  😀:0:1:,;|\n"quoted" &amp; 'apostrophe' ` + 'λ'.repeat(410) + '  ';
      const xmlBody = body.replace(/&amp;/g, '&#38;amp;');
      let xml =
        '<?xml version="1.0"?><review xmlns="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z">' +
        '<file path="src/🌌: odd,|;&quot;.ts" change-type="modified" viewed="true">' +
        Array.from(
          { length: 9 },
          (_, index) =>
            '<comment ' +
            (index % 2 === 0
              ? 'new-line-start="2" new-line-end="5" severity="major" confidence="low"'
              : 'old-line-start="7"') +
            `><body>${xmlBody}</body><category>  category:0:,|;😀  </category></comment>`
        ).join('') +
        '</file></review>';
      if (prefixed)
        xml = xml
          .replace('xmlns="urn:self-review:v2"', 'xmlns:sr="urn:self-review:v2"')
          .replace(/<(\/?)(review|file|comment|body|category)(?=[\s>])/g, '<$1sr:$2');
      const reviewFile = path.join(ws.planDir, 'review', 'review.xml');
      try {
        const result = await createFindingsGate()({
          reviewFile,
          xsdFile: ws.xsdFile,
          planDir: ws.planDir,
          reviewerStdout: `<<<BEGIN REVIEW XML abc>>>\n${xml}\n<<<END REVIEW XML abc>>>`,
          deliveryToken: 'abc',
        });
        expect(result).toMatchObject({
          kind: 'evaluated',
          counts: { total: 9, major: 5, unlabelled: 4 },
        });
        const record = JSON.parse(
          fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8')
        );
        expect(record.findings).toEqual(
          Array.from({ length: 9 }, (_, index) => ({
            file: 'src/🌌: odd,|;".ts',
            location: index % 2 === 0 ? 'new:2-5' : 'old:7-7',
            severity: index % 2 === 0 ? 'major' : null,
            confidence: index % 2 === 0 ? 'low' : null,
            category: 'category:0:,|;😀',
            summary: body.trim().slice(0, 400),
          }))
        );
      } finally {
        ws.cleanup();
      }
    }
  );

  it('preserves Unicode across native output chunks and the original 400-code-unit summary boundary', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const body = '😀:'.repeat(60_000);
    const xml = buildReviewXml([{ file: 'src/astral.ts', severity: 'minor', body }]);
    const reviewFile = path.join(ws.planDir, 'review', 'review.xml');
    try {
      const result = await createFindingsGate()({
        reviewFile,
        xsdFile: ws.xsdFile,
        planDir: ws.planDir,
        reviewerStdout: `<<<BEGIN REVIEW XML abc>>>\n${xml}\n<<<END REVIEW XML abc>>>`,
        deliveryToken: 'abc',
      });
      expect(result).toMatchObject({ kind: 'evaluated', counts: { total: 1, minor: 1 } });
      const record = JSON.parse(
        fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8')
      );
      expect(record.findings[0].summary).toBe(body.slice(0, 400));
    } finally {
      ws.cleanup();
    }
  });

  it('retains an empty findings array for a certified empty review', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const reviewFile = path.join(ws.planDir, 'review', 'review.xml');
    try {
      const result = await createFindingsGate()({
        reviewFile,
        xsdFile: ws.xsdFile,
        planDir: ws.planDir,
        reviewerStdout: `<<<BEGIN REVIEW XML abc>>>\n${buildReviewXml([])}\n<<<END REVIEW XML abc>>>`,
        deliveryToken: 'abc',
      });
      expect(result).toMatchObject({ kind: 'evaluated', counts: { total: 0 } });
      expect(
        JSON.parse(fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8'))
          .findings
      ).toEqual([]);
    } finally {
      ws.cleanup();
    }
  });

  it.each(['failure', 'inconsistent tally', 'projection failure', 'malformed projection'])(
    'halts without counts when xmllint validates but counting returns %s',
    async failure => {
      const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
      const bin = path.join(ws.root, 'bin');
      fs.mkdirSync(bin);
      const nativeXmllint = resolveExecutablePath('xmllint');
      expect(nativeXmllint).not.toBeNull();
      fs.writeFileSync(
        path.join(bin, 'xmllint'),
        `#!${process.execPath}
const {spawnSync} = require('child_process');
const args = process.argv.slice(2);
if (args.includes('--xpath') && (${JSON.stringify(failure)}.includes('projection') === args.join(' ').includes('string-length'))) {
  process.stdout.write(${JSON.stringify(failure === 'malformed projection' ? '1:x' : '0,1,0,0,0,0')});
  process.exit(${failure === 'failure' || failure === 'projection failure' ? 1 : 0});
}
const result = spawnSync(${JSON.stringify(nativeXmllint)}, args, {stdio: 'inherit'});
process.exit(result.status ?? 1);
`,
        { mode: 0o700 }
      );
      const previousPath = process.env.PATH;
      process.env.PATH = `${bin}${path.delimiter}${previousPath ?? ''}`;
      try {
        const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor' }]);
        const result = await runReview(
          { plan: '1', currentHarness: 'claude', startPath: ws.root },
          stubDeps({
            dispatch: async request => {
              const token = /<<<BEGIN REVIEW XML ([0-9a-f]+)>>>/.exec(request.prompt)?.[1] ?? '';
              return {
                kind: 'launched-success',
                exitCode: 0,
                stdout: `<<<BEGIN REVIEW XML ${token}>>>\n${xml}\n<<<END REVIEW XML ${token}>>>`,
              };
            },
          })
        );
        expect(result).toMatchObject({ kind: 'reviewed', verdict: { kind: 'review-failed' } });
        expect(result).not.toHaveProperty('counts');
        expect(_classify(result)).toEqual({ action: 'halt', exitCode: 1 });
        const record = JSON.parse(
          fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8')
        );
        expect(record.status).toBe('validator-unavailable');
        expect(record).not.toHaveProperty('counts');
        expect(record.findings).toEqual([]);
      } finally {
        process.env.PATH = previousPath;
        ws.cleanup();
      }
    }
  );
});
