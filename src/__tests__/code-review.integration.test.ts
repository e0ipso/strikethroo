/**
 * Integration tests for the review round mechanism (`code-review.ts`): the
 * fail-safe skip reasons, the diff scoping, and the round-budget bounding.
 *
 * Every dependency the round would otherwise use to reach a real harness
 * (`discover`, `dispatch`) or a real diff (`readDiff`) is injected here — a
 * test that depends on a harness CLI being installed, or on a real git
 * repository, is not a test of this module's own logic. The workspace shape
 * (hook / XSD / base-commit presence) is real filesystem state, built by the
 * shared `makeReviewGateWorkspace` factory, because that shape is exactly
 * what `resolveReviewContext` reads.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  _exitCodeFor,
  _readCumulativeDiff,
  MAX_REVIEW_ROUNDS,
  runBoundedReviewRound,
  runReviewRound,
  type FindingsGate,
  type ReviewRoundDependencies,
} from '../skill-scripts/code-review';
import { FAKE_SHA, makeReviewGateWorkspace } from './fixtures/review-gate';

const stubDeps = (overrides: Partial<ReviewRoundDependencies> = {}): ReviewRoundDependencies => ({
  discover: async () => ({ outcomes: [], reviewerCandidates: ['codex'] }),
  dispatch: async () => ({ kind: 'launched-success', exitCode: 0 }),
  readDiff: () => 'diff --git a/x.ts b/x.ts\n+something changed\n',
  validatorAvailable: () => true,
  ...overrides,
});

const alwaysActionable: FindingsGate = async () => ({
  kind: 'evaluated',
  aboveFloor: 1,
  belowFloor: 0,
  actionable: 1,
  recorded: 0,
  total: 1,
  aboveFloorWithoutSuggestion: 0,
  severityFloor: 'major',
  confidenceFloor: 'high',
  findingsFile: '/dev/null',
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
        const result = await runReviewRound(
          { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
          stubDeps()
        );
        expect(result).toMatchObject({ kind: 'skipped', reason });
        expect(_exitCodeFor(result)).toBe(0);
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
      const result = await runReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        stubDeps({ discover: async () => ({ outcomes: [], reviewerCandidates: [] }) })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'no-reviewer-candidate' });
      expect(_exitCodeFor(result)).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
      ws.cleanup();
    }
  });

  /**
   * A round dispatched with an empty diff returns no findings, which reads
   * exactly like a clean review — so an empty scope would surface as a pass. It
   * has to be reported instead, and no reviewer spent on it.
   */
  it('skips on empty-diff without dispatching a reviewer', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let dispatched = false;
    try {
      const result = await runReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        stubDeps({
          readDiff: () => '   \n',
          dispatch: async () => {
            dispatched = true;
            return { kind: 'launched-success', exitCode: 0 };
          },
        })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'empty-diff' });
      expect(_exitCodeFor(result)).toBe(0);
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
      const result = await runReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        stubDeps({ evaluateFindings: alwaysActionable })
      );
      expect(result.kind).toBe('reviewed');
    } finally {
      ws.cleanup();
    }
  });
});

describe('code review gate — round budget bounding', () => {
  it('bounds the loop at the compiled ceiling regardless of an inflated hook-stated budget', async () => {
    const ws = makeReviewGateWorkspace({
      baseCommit: FAKE_SHA,
      hook: '# CODE_REVIEW Hook\n\n## Round Budget: 9999\n',
    });
    try {
      const deps = stubDeps({ evaluateFindings: alwaysActionable });
      let executedRounds = 0;
      let last: Awaited<ReturnType<typeof runBoundedReviewRound>> | undefined;
      for (let round = 1; round <= MAX_REVIEW_ROUNDS + 5; round += 1) {
        last = await runBoundedReviewRound(
          { plan: '1', currentHarness: 'claude', round, startPath: ws.root },
          deps
        );
        executedRounds += 1;
        const continues = last.kind === 'reviewed' && last.decision?.kind === 'fix-and-continue';
        if (!continues) break;
      }

      // Every round reports actionable findings, so nothing but the compiled
      // ceiling itself could have stopped the loop.
      expect(executedRounds).toBe(MAX_REVIEW_ROUNDS);
      expect(last).toMatchObject({
        kind: 'reviewed',
        decision: { kind: 'budget-exhausted', actionable: 1 },
        roundBudget: MAX_REVIEW_ROUNDS,
        roundCeiling: MAX_REVIEW_ROUNDS,
      });
      expect(_exitCodeFor(last!)).toBe(1);

      // A round requested past the clamped budget is refused before any
      // reviewer is dispatched at all.
      let dispatches = 0;
      const countingDeps = stubDeps({
        evaluateFindings: alwaysActionable,
        dispatch: async () => {
          dispatches += 1;
          return { kind: 'launched-success', exitCode: 0 };
        },
      });
      const overBudget = await runBoundedReviewRound(
        { plan: '1', currentHarness: 'claude', round: MAX_REVIEW_ROUNDS + 1, startPath: ws.root },
        countingDeps
      );
      expect(overBudget).toMatchObject({
        kind: 'budget-exhausted',
        round: MAX_REVIEW_ROUNDS + 1,
        roundBudget: MAX_REVIEW_ROUNDS,
        roundCeiling: MAX_REVIEW_ROUNDS,
      });
      expect(dispatches).toBe(0);
      expect(_exitCodeFor(overBudget)).toBe(1);
    } finally {
      ws.cleanup();
    }
  });

  it('honours a tightened hook-stated budget: nothing is dispatched past it', async () => {
    const ws = makeReviewGateWorkspace({
      baseCommit: FAKE_SHA,
      hook: '# CODE_REVIEW Hook\n\n## Round Budget: 2\n',
    });
    try {
      let dispatches = 0;
      const deps = stubDeps({
        evaluateFindings: alwaysActionable,
        dispatch: async () => {
          dispatches += 1;
          return { kind: 'launched-success', exitCode: 0 };
        },
      });

      const round1 = await runBoundedReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        deps
      );
      expect(round1).toMatchObject({
        kind: 'reviewed',
        decision: { kind: 'fix-and-continue', nextRound: 2 },
        roundBudget: 2,
      });

      const round2 = await runBoundedReviewRound(
        { plan: '1', currentHarness: 'claude', round: 2, startPath: ws.root },
        deps
      );
      expect(round2).toMatchObject({
        kind: 'reviewed',
        decision: { kind: 'budget-exhausted' },
        roundBudget: 2,
      });
      expect(dispatches).toBe(2);

      const round3 = await runBoundedReviewRound(
        { plan: '1', currentHarness: 'claude', round: 3, startPath: ws.root },
        deps
      );
      expect(round3).toMatchObject({
        kind: 'budget-exhausted',
        roundBudget: 2,
        roundCeiling: MAX_REVIEW_ROUNDS,
      });
      // The tightened budget, not the compiled ceiling, is what stopped round 3.
      expect(dispatches).toBe(2);
    } finally {
      ws.cleanup();
    }
  });

  it('passes cleanly with no findings above floor, without exhausting the budget', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const noFindings: FindingsGate = async () => ({
        kind: 'evaluated',
        aboveFloor: 0,
        belowFloor: 0,
        actionable: 0,
        recorded: 0,
        total: 0,
        aboveFloorWithoutSuggestion: 0,
        severityFloor: 'major',
        confidenceFloor: 'high',
        findingsFile: '/dev/null',
      });
      const result = await runBoundedReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        stubDeps({ evaluateFindings: noFindings })
      );
      expect(result).toMatchObject({ kind: 'reviewed', decision: { kind: 'gate-passed' } });
      expect(_exitCodeFor(result)).toBe(0);
    } finally {
      ws.cleanup();
    }
  });
});

/**
 * The reviewed diff must exclude build output and vendored files.
 *
 * A finding against generated code is unfixable by construction: the suggestion
 * is applied as a text replacement, the mandatory full `POST_EXECUTION` re-run
 * regenerates the file, the fix vanishes, and the next round raises the same
 * finding because the source was never touched. That loop spends the whole
 * round budget and halts. These tests use a real git repository because the
 * exclusion is resolved by `git check-attr` against real `.gitattributes`.
 */
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
    fs.writeFileSync(path.join(repo, 'review/round-1.xml'), 'PRIOR_ROUND_FINDINGS\n');
    fs.writeFileSync(path.join(repo, 'real.ts'), 'export const real = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('PRIOR_ROUND_FINDINGS');
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
});

/**
 * `xmllint` is a soft dependency. Without it no round can be certified, but a
 * missing system package must never turn an otherwise successful plan into a
 * failure — so absence skips cleanly, before any reviewer is dispatched, and is
 * never reported as a review that passed.
 */
describe('code review gate — xmllint is a soft dependency', () => {
  it('skips with validator-absent: exit 0, empty stderr, no reviewer dispatched', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const result = await runReviewRound(
        { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
        stubDeps({ dispatch, validatorAvailable: () => false })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'validator-absent' });
      expect(_exitCodeFor(result)).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
      // The point of checking before dispatch: no external harness is spent on
      // a round that could not have been certified.
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('names an actionable fix rather than failing opaquely', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const result = await runReviewRound(
      { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
      stubDeps({ validatorAvailable: () => false })
    );
    expect(result).toMatchObject({ kind: 'skipped' });
    const detail = (result as { detail: string }).detail;
    expect(detail).toContain('xmllint');
    expect(detail).toContain('libxml2');
  });

  it('runs the round normally when the validator is available', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const result = await runReviewRound(
      { plan: '1', currentHarness: 'claude', round: 1, startPath: ws.root },
      stubDeps({ dispatch, validatorAvailable: () => true })
    );
    expect(result).not.toMatchObject({ reason: 'validator-absent' });
    expect(dispatch).toHaveBeenCalled();
  });
});
