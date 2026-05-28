/**
 * Plan Detail — Reader view (the `/plans/:id` Plan tab).
 *
 * Composes the execution-blueprint rail and the sanitized markdown prose into
 * the design's `.detail` two-column layout beneath `Chrome`, wired to live data
 * from `GET /api/plans/:id` via the shell's data-fetching layer
 * (`usePlanDetail`). It carries NO hardcoded plan content — plan 38 is only an
 * acceptance fixture, not baked-in data — and surfaces the shell's loading and
 * error surfaces while the request is in flight or fails.
 *
 * Chrome shows the breadcrumb trail ending in `plan.md`, the derived plan title,
 * the `Plan / Tasks / Graph / Execute` tab bar with Plan active, the plan's
 * `StatusPill`, and a `Copy path` ghost button that copies the plan file path.
 * The Tasks / Graph / Execute tabs are present in the bar but render no content
 * here — those belong to later tickets (Board/Graph, Execute).
 *
 * Ported from `scratch/ui/designs/screens-detail.jsx` (`PlanDetailReader`):
 * class names and layout are reproduced; all values come from the API payload.
 */

import { Chrome, type ChromeTab } from '../../components/Chrome';
import { StatusPill, Button, type StatusKind } from '../../components/primitives';
import { ErrorSurface, LoadingSurface } from '../../components/StateSurface';
import { usePlanDetail, type PlanDetail } from '../../data/api';
import { humanizeSlug, stripIdPrefix } from '../derive';
import { copyToClipboard } from '../../vendor/utils/clipboard';
import { BlueprintRail } from './BlueprintRail';
import { ReaderProse } from './ReaderProse';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/** The loaded Reader: Chrome + the `.detail` rail/prose grid bound to `detail`. */
function LoadedReader({ detail }: { detail: PlanDetail }) {
  const slug = stripIdPrefix(detail.name);
  const title = humanizeSlug(slug);
  const filename = basename(detail.file);

  // The plan-detail tab set; only the Tasks tab carries a count. Tabs whose
  // content lands in later tickets (Tasks/Graph/Execute) are present but inert.
  const tabs: ChromeTab[] = ['Plan', ['Tasks', detail.tasks.length], 'Graph', 'Execute'];

  return (
    <>
      <Chrome
        title={title}
        crumbs={['Plans', slug, 'plan.md']}
        tabs={tabs}
        activeTab={0}
        right={
          <>
            <StatusPill kind={detail.state as StatusKind} />
            <Button kind="ghost" size="sm" icon="copy" onClick={() => copyToClipboard(detail.file)}>
              Copy path
            </Button>
          </>
        }
      />
      <div className="detail">
        <BlueprintRail phases={detail.phases} tasks={detail.tasks} />
        <ReaderProse
          filename={filename}
          title={title}
          id={detail.id}
          created={detail.created}
          phaseCount={detail.phaseCount}
          taskCount={detail.tasks.length}
          sections={detail.sections}
        />
      </div>
    </>
  );
}

/** The `/plans/:id` Reader: fetches plan detail and renders loading/error/data. */
export function PlanDetailReader({ id }: { id: string }) {
  const detail = usePlanDetail(id);

  if (detail.status === 'loading') return <LoadingSurface label={`Loading plan ${id}…`} />;
  if (detail.status === 'error') return <ErrorSurface error={detail.error} />;
  return <LoadedReader detail={detail.data} />;
}
