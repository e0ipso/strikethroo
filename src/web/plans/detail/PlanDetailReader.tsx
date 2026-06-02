/**
 * Plan Detail — Reader body (the `/plans/:id` Plan tab content).
 *
 * Renders the design's two-column layout (sanitized markdown prose +
 * execution-blueprint rail on the right) for an already-loaded `PlanDetail`,
 * using a Tailwind flex row that stacks to one column below the `lg`
 * breakpoint. It carries NO
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
import { splitResultsSections } from '../derive';
import { BlueprintRail } from './BlueprintRail';
import { ReaderProse } from './ReaderProse';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/** The Reader body: the prose column + blueprint rail bound to `detail`. */
export function PlanDetailReader({ detail }: { detail: PlanDetail }) {
  const filename = basename(detail.file);
  // The Notes / Execution Blueprint tail moves to the Results tab; the Plan tab
  // shows the narrative sections that precede it.
  const { planSections } = splitResultsSections(detail.sections);

  return (
    // Wide prose is the primary column; the blueprint rail sits on the right and
    // stacks below the prose under the `lg` breakpoint. The rail's own left
    // border is the column divider, so the row carries no gap.
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        <ReaderProse
          filename={filename}
          id={detail.id}
          created={detail.created}
          phaseCount={detail.phaseCount}
          taskCount={detail.tasks.length}
          sections={planSections}
        />
      </div>
      <div className="lg:w-96 lg:shrink-0">
        <BlueprintRail planId={detail.name} phases={detail.phases} tasks={detail.tasks} />
      </div>
    </div>
  );
}
