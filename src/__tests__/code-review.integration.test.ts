/**
 * Integration tests for the review round mechanism (`code-review.ts`): the
 * five fail-safe skip reasons and the round-budget bounding.
 *
 * Every dependency the round would otherwise use to reach a real harness
 * (`discover`, `dispatch`) or a real diff (`readDiff`) is injected here — a
 * test that depends on a harness CLI being installed, or on a real git
 * repository, is not a test of this module's own logic. The workspace shape
 * (hook / XSD / base-commit presence) is real filesystem state, built by the
 * shared `makeReviewGateWorkspace` factory, because that shape is exactly
 * what `resolveReviewContext` reads.
 */

import {
  _exitCodeFor,
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
