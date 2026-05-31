/**
 * Plan Detail route container (`/plans/:id`).
 *
 * Owns the single data fetch (`usePlanDetail`), the shared `Chrome` (breadcrumb
 * trail, the Plan / Tasks / Graph / Execute tab strip, the plan `StatusPill`,
 * and the `Copy path` action), and the active-tab state. The tab strip is
 * interactive: selecting a tab swaps the body between the Reader (Plan), the
 * Board (Tasks), the Graph, and the Execute blueprint. The route has no tab in
 * its URL — tab selection is local UI state, mirroring the design where each
 * Plan Detail screen shares one Chrome and differs only in body. The Execute
 * tab renders the Execution blueprint (Swimlanes / Outline) via `ExecuteTab`.
 *
 * Loading and error states are surfaced by the shared StateSurface components
 * (never a blank screen / thrown error). Plan 38 is only an acceptance fixture,
 * never baked-in data.
 */

import { useState } from 'react';
import { Chrome, type ChromeTab } from '../../components/Chrome';
import { StatusPill, Button, type StatusKind } from '../../components/primitives';
import { ErrorSurface, LoadingSurface } from '../../components/StateSurface';
import { usePlanDetail, type PlanDetail } from '../../data/api';
import { humanizeSlug, stripIdPrefix } from '../derive';
import { copyToClipboard } from '../../vendor/utils/clipboard';
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

  const slug = stripIdPrefix(detail.name);
  const title = humanizeSlug(slug);

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
            <Button kind="ghost" size="sm" icon="copy" onClick={() => copyToClipboard(detail.file)}>
              Copy path
            </Button>
          </>
        }
      />
      {body}
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
