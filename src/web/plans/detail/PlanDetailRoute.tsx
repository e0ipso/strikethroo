/**
 * Plan Detail route container (`/plans/:id`).
 *
 * Owns the single data fetch (`usePlanDetail`), the shared `Chrome` (breadcrumb
 * trail, the Plan / Results / Graph / Tasks tab strip, the plan `StatusPill`,
 * and the `Copy path` action), and the active-tab state. The tab strip is
 * interactive: selecting a tab swaps the body between the Reader (Plan), the
 * Results markdown, the Graph, and the Execution blueprint (Tasks). The route
 * has no tab in its URL — tab selection is local UI state, mirroring the design
 * where each Plan Detail screen shares one Chrome and differs only in body. The
 * Tasks tab renders the Execution blueprint (Swimlanes / Outline) via
 * `ExecuteTab`. The tab strip itself is rendered (with Tailwind utilities) by
 * the shared `Chrome`; this container only supplies the tab data + state.
 *
 * Loading and error states are surfaced by the shared StateSurface components
 * (never a blank screen / thrown error). Plan 38 is only an acceptance fixture,
 * never baked-in data.
 */

import { useState } from 'react';
import { Chrome, type ChromeTab } from '../../components/Chrome';
import { StatusPill, Button, type StatusKind } from '../../components/primitives';
import { ErrorSurface, LoadingSurface } from '../../components/StateSurface';
import { usePlanDetail, useCapabilities, launchSelfReview, type PlanDetail } from '../../data/api';
import { humanizeSlug, planMdPath, stripIdPrefix } from '../derive';
import { copyToClipboard } from '../../vendor/utils/clipboard';
import { useModal, PlanModals } from '../modals';
import { PlanDetailReader } from './PlanDetailReader';
import { PlanDetailResults } from './PlanDetailResults';
import { PlanDetailGraph } from './PlanDetailGraph';
import { ExecuteTab } from '../exec/ExecuteTab';

/** The Plan Detail tabs, in order. The Tasks tab carries a count. */
const TAB_PLAN = 0;
const TAB_RESULTS = 1;
const TAB_GRAPH = 2;
const TAB_TASKS = 3;

/** The loaded route: shared Chrome plus the body for the active tab. */
function LoadedRoute({ detail }: { detail: PlanDetail }) {
  const [activeTab, setActiveTab] = useState<number>(TAB_PLAN);
  const modal = useModal();
  const caps = useCapabilities();
  const [launching, setLaunching] = useState(false);

  const slug = stripIdPrefix(detail.name);
  const title = humanizeSlug(slug);

  // The plan markdown path self-review opens.
  const planPath = planMdPath({ id: detail.id, slug });

  // The header Review action launches self-review directly when the binary is
  // installed. When it isn't (or a launch fails), fall back to the modal — the
  // not-installed variant carries the install promo and the launcher variant
  // surfaces the terminal-command fallback.
  const onReview = () => {
    const available = caps.status === 'data' && caps.data.selfReview;
    if (!available) {
      modal.openReview(planPath);
      return;
    }
    setLaunching(true);
    void launchSelfReview(planPath).then(result => {
      setLaunching(false);
      if (!result.ok) modal.openReview(planPath);
    });
  };

  // The plan-detail tab set; only the Tasks tab carries a count.
  const tabs: ChromeTab[] = ['Plan', 'Results', 'Graph', ['Tasks', detail.tasks.length]];

  let body;
  switch (activeTab) {
    case TAB_RESULTS:
      body = <PlanDetailResults detail={detail} />;
      break;
    case TAB_GRAPH:
      body = <PlanDetailGraph detail={detail} />;
      break;
    case TAB_TASKS:
      body = <ExecuteTab detail={detail} />;
      break;
    case TAB_PLAN:
    default:
      body = <PlanDetailReader detail={detail} />;
      break;
  }

  return (
    <>
      <Chrome
        title={title}
        crumbs={[{ label: 'Plans', href: '/' }, slug, 'plan.md']}
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        right={
          <>
            <StatusPill kind={detail.state as StatusKind} />
            {detail.state === 'drafted' && (
              <Button
                kind="outline"
                size="sm"
                icon="review"
                onClick={launching ? undefined : onReview}
              >
                {launching ? 'Launching…' : 'Review in self-review'}
              </Button>
            )}
            <Button kind="ghost" size="sm" icon="copy" onClick={() => copyToClipboard(detail.file)}>
              Copy path
            </Button>
          </>
        }
      />
      {body}
      <PlanModals modal={modal.modal} onClose={modal.close} />
    </>
  );
}

/** The `/plans/:id` route: fetches plan detail and renders loading/error/data. */
export function PlanDetailRoute({ id }: { id: string }) {
  const detail = usePlanDetail(id);

  if (detail.status === 'loading') return <LoadingSurface label={`Loading plan ${id}…`} />;
  if (detail.status === 'error') return <ErrorSurface error={detail.error} />;
  return <LoadedRoute detail={detail.data} />;
}
