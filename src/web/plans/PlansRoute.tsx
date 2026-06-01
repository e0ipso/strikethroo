/**
 * Plans route container (Plan 86, Task 006).
 *
 * The single routed feature module for the Plans section. It mounts the Task
 * 001 data layer once, surfaces its loading / error states through the shared
 * surfaces, holds the active-view tab (Board / Cards) in local state and
 * switches between the two views in place via the Chrome tabs, exposes the
 * "Create plan" action that opens the Create modal, and feeds the derived
 * All / Active / Drafts counters into the Chrome. It composes Tasks 1–5; it
 * does not reimplement the views, modals, data layer, router, or primitives.
 */

import { useState } from 'react';
import { Chrome } from '../components/Chrome';
import { Button } from '../components/primitives';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { usePlansData } from './usePlansData';
import { PlansCardView } from './PlansCardView';
import { PlansKanbanView } from './PlansKanbanView';
import { PlanModals, useModal } from './modals';
import type { TabCounts } from './derive';

/** The interchangeable Plans views, in tab order. */
const VIEWS = ['Board', 'Cards'] as const;
type ViewName = (typeof VIEWS)[number];

/** The Chrome top bar for the Plans route: switcher tabs + Create action. */
function PlansChrome({
  view,
  onSelectView,
  counts,
  onCreate,
}: {
  view: ViewName;
  onSelectView: (index: number) => void;
  counts: TabCounts | null;
  onCreate: () => void;
}) {
  const activeIndex = VIEWS.indexOf(view);
  return (
    <Chrome
      title="Plans"
      crumbs={[{ label: 'workspace', href: '/' }, 'plans']}
      tabs={VIEWS.map(v => v as string)}
      activeTab={activeIndex}
      onTabSelect={onSelectView}
      right={
        <>
          {counts && (
            <div
              className="mono"
              data-testid="plan-counts"
              style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}
            >
              <span data-testid="count-all">All {counts.all}</span>
              <span style={{ color: 'var(--ink-3)' }} data-testid="count-active">
                Active {counts.active}
              </span>
              <span style={{ color: 'var(--ink-3)' }} data-testid="count-drafts">
                Drafts {counts.drafts}
              </span>
            </div>
          )}
          <Button kind="primary" size="sm" icon="plus" onClick={onCreate}>
            Create plan
          </Button>
        </>
      }
    />
  );
}

/** The composed Plans route: chrome + active view + modals, driven by live data. */
export function PlansRoute() {
  const [view, setView] = useState<ViewName>('Board');
  const resource = usePlansData();
  const modal = useModal();

  const counts = resource.status === 'data' ? resource.data.counts : null;

  let body;
  if (resource.status === 'loading') {
    body = <LoadingSurface label="Loading plans…" />;
  } else if (resource.status === 'error') {
    body = <ErrorSurface error={resource.error} />;
  } else {
    const { plans } = resource.data;
    if (view === 'Cards')
      body = (
        <PlansCardView
          plans={plans}
          openReview={modal.openReview}
          openArchive={modal.openArchive}
        />
      );
    else
      body = (
        <PlansKanbanView
          plans={plans}
          openReview={modal.openReview}
          openArchive={modal.openArchive}
        />
      );
  }

  return (
    <>
      <PlansChrome
        view={view}
        onSelectView={i => setView(VIEWS[i] ?? 'Board')}
        counts={counts}
        onCreate={modal.openCreate}
      />
      {body}
      <PlanModals modal={modal.modal} onClose={modal.close} />
    </>
  );
}
