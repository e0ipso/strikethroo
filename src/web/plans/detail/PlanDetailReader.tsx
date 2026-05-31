/**
 * Plan Detail — Reader body (the `/plans/:id` Plan tab content).
 *
 * Renders the design's `.detail` two-column layout (execution-blueprint rail +
 * sanitized markdown prose) for an already-loaded `PlanDetail`. It carries NO
 * Chrome and NO data fetch: the surrounding `PlanDetailRoute` owns the shared
 * `Chrome` (crumbs / tab strip / StatusPill / actions), the `usePlanDetail`
 * fetch, and the loading/error surfaces, then mounts this body when the Plan tab
 * is active. The Board (Tasks tab) and Graph (Graph tab) bodies are sibling
 * components mounted by the same route container.
 *
 * Ported from `scratch/ui/designs/screens-detail.jsx` (`PlanDetailReader`):
 * class names and layout are reproduced; all values come from the API payload.
 */

import type { PlanDetail } from '../../data/api';
import { humanizeSlug, splitResultsSections, stripIdPrefix } from '../derive';
import { BlueprintRail } from './BlueprintRail';
import { ReaderProse } from './ReaderProse';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/** The Reader body: the `.detail` rail/prose grid bound to `detail`. */
export function PlanDetailReader({ detail }: { detail: PlanDetail }) {
  const slug = stripIdPrefix(detail.name);
  const title = humanizeSlug(slug);
  const filename = basename(detail.file);
  // The Notes / Execution Blueprint tail moves to the Results tab; the Plan tab
  // shows the narrative sections that precede it.
  const { planSections } = splitResultsSections(detail.sections);

  return (
    <div className="detail">
      <ReaderProse
        filename={filename}
        title={title}
        id={detail.id}
        created={detail.created}
        phaseCount={detail.phaseCount}
        taskCount={detail.tasks.length}
        sections={planSections}
      />
      <BlueprintRail phases={detail.phases} tasks={detail.tasks} />
    </div>
  );
}
