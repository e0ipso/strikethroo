/**
 * Composed application shell for `strikethroo serve`.
 *
 * Mounts the router provider, renders the persistent Sidebar + Chrome frame on
 * every route, and switches the main content into a per-section placeholder
 * slot. The slots are intentionally minimal — they exercise the data layer's
 * loading / error / data states so navigation and the API wiring are verifiable
 * before any real screen exists. Screen tickets (later plans) replace the
 * placeholder bodies; this file establishes the mount point and slot pattern.
 *
 * No mock data lives here: every slot's data comes from the data-layer hooks,
 * and an unreachable API renders the visible error surface (never a blank).
 */

import type { ReactNode } from 'react';
import { RouterProvider, useRoute } from './router';
import { Sidebar } from './components/Sidebar';
import { Chrome } from './components/Chrome';
import { usePlans, usePlanDetail, useConfig, type Resource } from './data/api';
import { ErrorSurface, LoadingSurface, PlaceholderSurface } from './components/StateSurface';

/**
 * Renders the three data states for a resource with a shared loading/error
 * surface and a slot-specific `data` renderer. Keeps each slot focused on what
 * it shows once data arrives.
 */
function ResourceView<T>({
  resource,
  loadingLabel,
  children,
}: {
  resource: Resource<T>;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (resource.status === 'loading') return <LoadingSurface label={loadingLabel} />;
  if (resource.status === 'error') return <ErrorSurface error={resource.error} />;
  return <>{children(resource.data)}</>;
}

/** Plans list slot — exercises usePlans; real list is a later screen ticket. */
function PlansSlot() {
  const plans = usePlans();
  return (
    <ResourceView resource={plans} loadingLabel="Loading plans…">
      {data => (
        <PlaceholderSurface>
          {data.length} plan{data.length === 1 ? '' : 's'} loaded. The Plans screen lands in a later
          ticket.
        </PlaceholderSurface>
      )}
    </ResourceView>
  );
}

/** Plan detail slot — exercises usePlanDetail; real reader is a later ticket. */
function PlanDetailSlot({ id }: { id: string }) {
  const detail = usePlanDetail(id);
  return (
    <ResourceView resource={detail} loadingLabel={`Loading plan ${id}…`}>
      {data => (
        <PlaceholderSurface>
          Loaded plan {data.id}: “{data.summary ?? data.name}”. The Plan Detail screen lands in a
          later ticket.
        </PlaceholderSurface>
      )}
    </ResourceView>
  );
}

/** Archive slot — exercises usePlans (archived filtered by a later ticket). */
function ArchiveSlot() {
  const plans = usePlans();
  return (
    <ResourceView resource={plans} loadingLabel="Loading archive…">
      {data => (
        <PlaceholderSurface>
          {data.filter(p => p.archived).length} archived plan(s). The Archive screen lands in a
          later ticket.
        </PlaceholderSurface>
      )}
    </ResourceView>
  );
}

/** Customize slot — exercises useConfig; real editor is a later ticket. */
function CustomizeSlot() {
  const config = useConfig();
  return (
    <ResourceView resource={config} loadingLabel="Loading config…">
      {data => (
        <PlaceholderSurface>
          {data.hooks.length} hook(s) and {data.templates.length} template(s). The Customize screen
          lands in a later ticket.
        </PlaceholderSurface>
      )}
    </ResourceView>
  );
}

/** Reads the current route and renders the matching Chrome + content slot. */
function Shell() {
  const route = useRoute();

  let chrome: ReactNode;
  let content: ReactNode;

  switch (route.section) {
    case 'plans':
      chrome = <Chrome title="Plans" />;
      content = <PlansSlot />;
      break;
    case 'planDetail': {
      const id = route.params.id ?? '';
      chrome = (
        <Chrome
          title={`Plan ${id}`}
          crumbs={['Plans', `#${id}`]}
          tabs={['Overview', 'Tasks', 'Execution']}
          activeTab={0}
        />
      );
      content = <PlanDetailSlot id={id} />;
      break;
    }
    case 'archive':
      chrome = <Chrome title="Archive" />;
      content = <ArchiveSlot />;
      break;
    case 'customize':
      chrome = <Chrome title="Customize" />;
      content = <CustomizeSlot />;
      break;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        {chrome}
        {content}
      </div>
    </div>
  );
}

/** Top-level app: wraps the shell in the router provider. */
export function App() {
  return (
    <RouterProvider>
      <Shell />
    </RouterProvider>
  );
}
