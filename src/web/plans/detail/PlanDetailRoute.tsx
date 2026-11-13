/**
 * Plan Detail route container (`/plans/:id`).
 *
 * Owns the single data fetch (`usePlanDetail`), the shared `Chrome` (breadcrumb
 * trail, the narrative / Results / Graph / Tasks tab strip, the plan `StatusPill`,
 * and the `Copy path` action), and the active-tab state. The tab strip is
 * interactive: selecting a tab swaps the body between the narrative Reader, the
 * Results markdown, the Graph, and the Execution blueprint (Tasks). The route
 * has no tab in its URL — tab selection is local UI state, mirroring the design
 * where each Plan Detail screen shares one Chrome and differs only in body. The
 * Tasks tab renders the Execution blueprint (Swimlanes) via
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
import {
  usePlanDetail,
  useCapabilities,
  isReadOnly,
  launchSelfReview,
  type PlanDetail,
} from '../../data/api';
import {
  humanizeSlug,
  stripIdPrefix,
  splitResultsSections,
  splitOverviewSections,
} from '../derive';
import { copyToClipboard } from '../../vendor/utils/clipboard';
import { useModal, PlanModals } from '../modals';
import { PlanDetailReader } from './PlanDetailReader';
import { PlanDetailResults } from './PlanDetailResults';
import { PlanDetailGraph } from './PlanDetailGraph';
import { ExecuteTab } from '../exec/ExecuteTab';

type DetailTab = 'plan' | 'design' | 'results' | 'graph' | 'tasks';

/** The loaded route: shared Chrome plus the body for the active tab. */
function LoadedRoute({ detail }: { detail: PlanDetail }) {
  const [activeTab, setActiveTab] = useState<DetailTab>('plan');
  const modal = useModal();
  const caps = useCapabilities();
  const readOnly = isReadOnly(caps);
  const [launching, setLaunching] = useState(false);

  const slug = stripIdPrefix(detail.name);
  const title = humanizeSlug(slug);

  // The plan markdown path self-review opens, as the server resolved it.
  // Rebuilding it as `plans/<name>/plan-<name>.md` 404s for an archived plan
  // and for any plan whose markdown filename differs. `resolveReviewPath`
  // accepts this absolute path and still enforces containment, so the modal
  // shows an absolute, runnable command.
  const planPath = detail.file;

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

  const { planSections } = splitResultsSections(detail.sections);
  const { overviewSections, designSections } = splitOverviewSections(planSections);
  const hasOverview = overviewSections.length > 0;
  const tabIds: DetailTab[] = hasOverview
    ? ['plan', 'design', 'results', 'graph', 'tasks']
    : ['plan', 'results', 'graph', 'tasks'];
  const tabs: ChromeTab[] = [
    ...(hasOverview ? ['Overview', 'Design'] : ['Plan']),
    'Results',
    'Graph',
    ['Tasks', detail.tasks.length],
  ];
  // Preserve the selected tab when live updates change the narrative tab set.
  const selectedTab = tabIds.includes(activeTab) ? activeTab : 'plan';

  let body;
  switch (selectedTab) {
    case 'results':
      body = <PlanDetailResults detail={detail} />;
      break;
    case 'graph':
      body = <PlanDetailGraph detail={detail} />;
      break;
    case 'tasks':
      body = <ExecuteTab detail={detail} />;
      break;
    case 'design':
      body = <PlanDetailReader detail={detail} sections={designSections} />;
      break;
    case 'plan':
    default:
      body = (
        <PlanDetailReader
          detail={detail}
          sections={hasOverview ? overviewSections : planSections}
          showBlueprintRail={!hasOverview}
        />
      );
      break;
  }

  return (
    <>
      <Chrome
        title={title}
        crumbs={[{ label: 'Plans', href: '/' }, slug, 'plan.md']}
        tabs={tabs}
        activeTab={tabIds.indexOf(selectedTab)}
        onTabSelect={index => setActiveTab(tabIds[index])}
        right={
          <>
            <StatusPill kind={detail.state as StatusKind} />
            {detail.state === 'drafted' && !readOnly && (
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
