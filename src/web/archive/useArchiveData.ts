/**
 * Archive-section data adapter (Plan 90, Task 002).
 *
 * Subscribes to the live `/api/plans` model through the Plan 85 data layer
 * (`usePlans`), passes its loading / error states straight through, and on
 * `data` filters to the archived slice (`archived === true`), maps each entry to
 * the {@link ArchivePlanView} shape, and sorts by `completedAt` descending (with
 * a `created` fallback via the Task 001 comparator). No fetch or HTTP code lives
 * here — the design's `ARCHIVE_PLANS` mock is intentionally absent.
 *
 * Upstream gap: the serve API model (src/serve/workspace-model.ts) does not yet
 * surface `completedAt` or `branch`. The plan documents both as optional and the
 * screen renders gracefully when they are absent; this adapter simply omits them
 * until an upstream ticket derives them.
 */

import { usePlans, type PlanSummary, type Resource } from '../data/api';
import { humanizeSlug, stripIdPrefix } from '../plans/derive';
import { byCompletedDesc, type ArchivePlanView } from './helpers';

/** Adapts one archived API `PlanSummary` to the Archive view shape. */
const mapArchivePlan = (api: PlanSummary): ArchivePlanView => {
  const slug = stripIdPrefix(api.name);
  return {
    id: api.id,
    slug,
    title: humanizeSlug(slug),
    summary: api.summary ?? '',
    done: api.done ?? 0,
    total: api.total ?? 0,
    phaseCount: api.phaseCount ?? 0,
    created: api.created ?? '',
    archived: api.archived,
    // completedAt / branch are not surfaced by the current API model; left
    // undefined so the screen renders its defensive fallbacks.
    completedAt: undefined,
    branch: undefined,
  };
};

/**
 * Returns the Archive section's data resource. Identical state machine to the
 * underlying `usePlans`: `loading` / `error` pass through unchanged; `data`
 * carries the archived plans, mapped and sorted (`completedAt` desc).
 */
export const useArchiveData = (): Resource<ArchivePlanView[]> => {
  const resource = usePlans();
  if (resource.status !== 'data') return resource;

  const plans = resource.data
    .filter(p => p.archived === true)
    .map(mapArchivePlan)
    .sort(byCompletedDesc);
  return { status: 'data', data: plans };
};
