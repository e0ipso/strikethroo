import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import {
  checkHarnessAvailability,
  type HarnessAvailabilityDependencies,
  type HarnessAvailabilityOutcome,
} from './harness-availability';
import { loadHarnessConfiguration } from './harness-configuration';
import { resolveCliArgs } from './cli-args-models';

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
  /**
   * Reviewer candidates in preference order: ready alternatives in
   * `SUPPORTED_HARNESSES` order, then the current harness when it is ready too.
   */
  reviewerCandidates: Harness[];
  /**
   * Exact invocation that made each reviewer candidate ready, with the model
   * names in its `cli_args` replaced by the ids the probe mapped.
   */
  reviewerInvocations?: Partial<
    Record<
      Harness,
      {
        cliArgs: readonly string[];
      }
    >
  >;
  /** Invalid local configuration prevents external discovery from proceeding. */
  configurationErrors?: readonly string[];
}

/**
 * Enumerate every supported harness's review readiness and derive the
 * reviewer candidates. Ready alternatives to the current harness keep their
 * stable order and come first. The current harness comes last when it is ready.
 * Preferring another harness is a best-effort diversity measure: a CLI name
 * does not establish a different provider or model. The independence boundary
 * is the clean session that every review launch must use. Every harness, the
 * current one included, is probed as a separate CLI process with
 * `purpose: 'review'`, so the native bypass never authorizes a review. Never
 * throws: a probe failure yields `available: false` for that harness, so an
 * empty candidate set is a normal result.
 */
export const discoverHarnesses = async (
  request: DiscoverHarnessesRequest,
  overrides: Partial<HarnessAvailabilityDependencies> = {}
): Promise<HarnessDiscoveryResult> => {
  const configuration = loadHarnessConfiguration(request.strikethrooRoot);
  if (configuration.kind === 'invalid') {
    const now = (overrides.now ?? Date.now)();
    return {
      outcomes: SUPPORTED_HARNESSES.map(harness => ({
        harness,
        available: false,
        observedAt: now,
        expiresAt: now,
        reason: 'Harness configuration is invalid.',
        source: 'probe' as const,
      })),
      reviewerCandidates: [],
      configurationErrors: configuration.errors,
    };
  }

  const resolvedCliArgs = new Map<Harness, readonly string[]>();
  const outcomes = await Promise.all(
    SUPPORTED_HARNESSES.map(async harness => {
      try {
        const outcome = await checkHarnessAvailability(
          {
            strikethrooRoot: request.strikethrooRoot,
            workspace: request.workspace,
            harness,
            currentHarness: request.currentHarness,
            invocation: configuration.config[harness],
            purpose: 'review',
          },
          overrides
        );
        if (!outcome.available) return outcome;
        // A reviewer runs with the model its cli_args select, so a name that
        // cannot be mapped makes the harness unavailable for review.
        const cliArgs = resolveCliArgs(
          harness,
          configuration.config[harness].cliArgs,
          outcome.models
        );
        if (cliArgs.kind === 'unresolved') {
          return { ...outcome, available: false, reason: cliArgs.detail };
        }
        resolvedCliArgs.set(harness, cliArgs.cliArgs);
        return outcome;
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

  const isReady = (harness: Harness): boolean =>
    outcomes.find(candidate => candidate.harness === harness)?.available === true;
  const alternatives = SUPPORTED_HARNESSES.filter(
    harness => harness !== request.currentHarness && isReady(harness)
  );
  const reviewerCandidates = isReady(request.currentHarness)
    ? [...alternatives, request.currentHarness]
    : alternatives;

  const reviewerInvocations = Object.fromEntries(
    reviewerCandidates.map(harness => [
      harness,
      { cliArgs: resolvedCliArgs.get(harness) ?? configuration.config[harness].cliArgs },
    ])
  );

  return { outcomes, reviewerCandidates, reviewerInvocations };
};
