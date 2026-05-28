/**
 * Plans-section data adapter (Plan 86, Task 001).
 *
 * Subscribes to the live `/api/plans` model through the Plan 85 data-fetching
 * layer (`usePlans`) and surfaces its loading / error / data states straight
 * through — no fetch or HTTP code is written here. On `data`, it filters to the
 * active (non-archived) plans the Plans section shows, maps each through the
 * single `mapPlan` adapter, and pre-computes the All / Active / Drafts tab
 * counters so the route container and every view share one derived source.
 */

import { usePlans, type Resource } from '../data/api';
import { mapPlan, tabCounts, type PlanView, type TabCounts } from './derive';

/** The derived data the Plans section consumes once `/api/plans` resolves. */
export interface PlansData {
  /** Active (non-archived) plans, mapped to the view shape. */
  plans: PlanView[];
  /** All / Active / Drafts counters derived from `plans`. */
  counts: TabCounts;
}

/**
 * Returns the Plans section's data resource. Identical state machine to the
 * underlying `usePlans`: `loading` and `error` pass through unchanged; `data`
 * carries the mapped active plans plus the derived tab counters.
 */
export const usePlansData = (): Resource<PlansData> => {
  const resource = usePlans();
  if (resource.status !== 'data') return resource;

  const plans = resource.data.filter(p => !p.archived).map(mapPlan);
  return { status: 'data', data: { plans, counts: tabCounts(plans) } };
};
