import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import {
  checkHarnessAvailability,
  type HarnessAvailabilityDependencies,
  type HarnessAvailabilityOutcome,
} from './harness-availability';

/**
 * Harness discovery: "which harnesses are installed and responsive right
 * now", independent of whether the workspace has `execution_routing`
 * configured. Reuses the availability cache/probe/TTL machinery in
 * `harness-availability.ts` — this module adds no caching of its own.
 *
 * Shaped so `execution_routing` could consume it later, but deliberately not
 * wired to it here; that reconciliation is tracked separately (strikethroo#67).
 */

export interface DiscoverHarnessesRequest {
  strikethrooRoot: string;
  workspace: string;
  currentHarness: Harness;
}

export interface HarnessDiscoveryResult {
  /** Every supported harness with its resolved availability outcome. */
  outcomes: HarnessAvailabilityOutcome[];
  /** Reachable harnesses excluding the current one — the reviewer candidates. */
  reviewerCandidates: Harness[];
}

/**
 * Enumerate every supported harness's current availability and derive the
 * reviewer-candidate subset: reachable harnesses other than the current one.
 * The current harness is always excluded from candidates, even though its
 * own availability check short-circuits to an available "bypass" outcome —
 * a reviewer on the same harness as the implementer defeats the point of the
 * gate. Never throws: a probe failure yields `available: false` for that
 * harness, not an exception, so an empty candidate set is a normal result.
 */
export const discoverHarnesses = async (
  request: DiscoverHarnessesRequest,
  overrides: Partial<HarnessAvailabilityDependencies> = {}
): Promise<HarnessDiscoveryResult> => {
  const outcomes = await Promise.all(
    SUPPORTED_HARNESSES.map(async harness => {
      try {
        return await checkHarnessAvailability(
          {
            strikethrooRoot: request.strikethrooRoot,
            workspace: request.workspace,
            harness,
            currentHarness: request.currentHarness,
          },
          overrides
        );
      } catch (error) {
        const now = Date.now();
        return {
          harness,
          available: false,
          observedAt: now,
          expiresAt: now,
          reason: error instanceof Error ? error.message : 'Harness availability check failed.',
          source: 'probe' as const,
        };
      }
    })
  );

  const reviewerCandidates = SUPPORTED_HARNESSES.filter(harness => {
    if (harness === request.currentHarness) return false;
    const outcome = outcomes.find(candidate => candidate.harness === harness);
    return outcome?.available === true;
  });

  return { outcomes, reviewerCandidates };
};
