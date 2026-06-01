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
import { LiveConnectionProvider } from './data/liveConnection';
import { RevalidationProvider } from './data/revalidation';
import { ThemeProvider } from './theme/ThemeProvider';
import { Sidebar } from './components/Sidebar';
import { usePlans } from './data/api';
import { PlansRoute } from './plans/PlansRoute';
import { PlanDetailRoute } from './plans/detail/PlanDetailRoute';
import { ArchiveRoute } from './archive/ArchiveRoute';
import { CustomizeRoute } from './customize/CustomizeRoute';

/**
 * The persistent Sidebar with live destination counts. Reads the plan list to
 * surface the archived-plan count next to the Archive nav item (per the design);
 * while loading or on error it renders the Sidebar without counts rather than
 * blocking the frame.
 */
function SidebarWithCounts() {
  const plans = usePlans();
  const counts =
    plans.status === 'data' ? { Archive: plans.data.filter(p => p.archived).length } : undefined;
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
      // The Customize route renders its own Chrome (crumbs / tabs / inert
      // actions) and owns tab switching, so no separate top bar is composed here.
      chrome = null;
      content = <CustomizeRoute />;
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

/**
 * Top-level app. Provider order, outside-in:
 *   - LiveConnectionProvider: the single shared `EventSource`, outside the
 *     router so one stream is shared for the SPA's lifetime regardless of route
 *     (no per-screen duplicate streams);
 *   - RevalidationProvider: subscribes to the connection's `changed` signal and
 *     exposes the coalesced revalidation token the data layer folds in;
 *   - RouterProvider: route state the mounted screens read at fetch time.
 *
 * ThemeProvider wraps the whole stack so the Sidebar (and its ThemeToggle) and
 * every screen are inside it; it owns no data and is order-independent here.
 */
export function App() {
  return (
    <ThemeProvider>
      <LiveConnectionProvider>
        <RevalidationProvider>
          <RouterProvider>
            <Shell />
          </RouterProvider>
        </RevalidationProvider>
      </LiveConnectionProvider>
    </ThemeProvider>
  );
}
