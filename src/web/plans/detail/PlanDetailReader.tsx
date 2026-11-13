/**
 * Plan Detail reader body for the Overview, Design, or legacy Plan tab.
 *
 * Renders supplied narrative sections with the shared sanitized prose renderer.
 * Design and legacy Plan include a blueprint rail on the right, stacking below
 * the prose under the `lg` breakpoint. Overview uses the full width for prose.
 * The surrounding route owns the data fetch, Chrome, and loading/error states.
 *
 * Ported from `scratch/ui/designs/screens-detail.jsx` (`PlanDetailReader`):
 * class names and layout are reproduced; all values come from the API payload.
 */

import type { MarkdownSection, PlanDetail } from '../../data/api';
import { BlueprintRail } from './BlueprintRail';
import { ReaderProse } from './ReaderProse';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/** The prose column and optional blueprint rail bound to `detail`. */
export function PlanDetailReader({
  detail,
  sections,
  showBlueprintRail = true,
}: {
  detail: PlanDetail;
  sections: MarkdownSection[];
  showBlueprintRail?: boolean;
}) {
  const filename = basename(detail.file);

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
          sections={sections}
        />
      </div>
      {showBlueprintRail && (
        <div className="lg:w-96 lg:shrink-0">
          <BlueprintRail planId={detail.name} phases={detail.phases} tasks={detail.tasks} />
        </div>
      )}
    </div>
  );
}
