/**
 * Archive-section data adapter (Plan 90, Task 002).
 *
 * Subscribes to the live `/api/plans` model through the Plan 85 data layer
 * (`usePlans`), passes its loading / error states straight through, and on
 * `data` filters to the archived slice (`archived === true`), maps each entry to
 * the {@link ArchivePlanView} shape, and sorts by `created` descending (the only
 * date the model surfaces for archived plans). No fetch or HTTP code lives here
 * — the design's `ARCHIVE_PLANS` mock is intentionally absent.
 *
 * The serve API model (src/serve/workspace-model.ts) surfaces no completion
 * date for archived plans, so the whole Archive date axis (sort, filter, group,
 * the displayed column) is `created`. `branch` is likewise not surfaced and is
 * left undefined; the screen renders its defensive fallback.
 */

import { usePlans, type PlanSummary, type Resource } from '../data/api';
import { humanizeSlug, stripIdPrefix } from '../plans/derive';
import { byCreatedDesc, type ArchivePlanView } from './helpers';

/** Adapts one archived API `PlanSummary` to the Archive view shape. */
const mapArchivePlan = (api: PlanSummary): ArchivePlanView => {
  const slug = stripIdPrefix(api.name);
  return {
    id: api.id,
    name: api.name,
    slug,
    title: humanizeSlug(slug),
    summary: api.summary ?? '',
    done: api.done ?? 0,
    total: api.total ?? 0,
    phaseCount: api.phaseCount ?? 0,
    created: api.created ?? '',
    archived: api.archived,
    // branch is not surfaced by the current API model; left undefined so the
    // screen renders its defensive fallback.
    branch: undefined,
  };
};

/**
 * Returns the Archive section's data resource. Identical state machine to the
 * underlying `usePlans`: `loading` / `error` pass through unchanged; `data`
 * carries the archived plans, mapped and sorted (`created` desc).
 */
export const useArchiveData = (): Resource<ArchivePlanView[]> => {
  const resource = usePlans();
  if (resource.status !== 'data') return resource;

  const plans = resource.data
    .filter(p => p.archived === true)
    .map(mapArchivePlan)
    .sort(byCreatedDesc);
  return { status: 'data', data: plans };
};
