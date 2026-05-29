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
import { usePlans, useConfig, type Resource } from './data/api';
import { ErrorSurface, LoadingSurface, PlaceholderSurface } from './components/StateSurface';
import { PlansRoute } from './plans/PlansRoute';
import { PlanDetailRoute } from './plans/detail/PlanDetailRoute';
import { ArchiveRoute } from './archive/ArchiveRoute';

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

/**
 * The persistent Sidebar with live destination counts. Reads the plan list to
 * surface the archived-plan count next to the Archive nav item (per the design);
 * while loading or on error it renders the Sidebar without counts rather than
 * blocking the frame.
 */
function SidebarWithCounts() {
  const plans = usePlans();
  const counts =
    plans.status === 'data'
      ? { Archive: plans.data.filter(p => p.archived).length }
      : undefined;
  return <Sidebar counts={counts} />;
}

/** Reads the current route and renders the matching Chrome + content slot. */
function Shell() {
  const route = useRoute();

  let chrome: ReactNode;
  let content: ReactNode;

  switch (route.section) {
    case 'plans':
      // The Plans route renders its own Chrome (switcher tabs + counters), so
      // no separate top bar is composed here.
      chrome = null;
      content = <PlansRoute />;
      break;
    case 'planDetail': {
      const id = route.params.id ?? '';
      // The route container renders its own Chrome (crumbs / tabs / StatusPill /
      // actions) and owns tab switching, so no separate top bar is composed here.
      chrome = null;
      content = <PlanDetailRoute id={id} />;
      break;
    }
    case 'archive':
      // The Archive route renders its own Chrome (crumbs / tabs / inert
      // controls), so no separate top bar is composed here.
      chrome = null;
      content = <ArchiveRoute />;
      break;
    case 'customize':
      chrome = <Chrome title="Customize" />;
      content = <CustomizeSlot />;
      break;
  }

  return (
    <div className="app">
      <SidebarWithCounts />
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
