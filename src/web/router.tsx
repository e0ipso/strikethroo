/**
 * Minimal dependency-free client router for the Strikethroo SPA.
 *
 * The route set is small and static (Plans, Plan Detail, Task Detail, Archive,
 * Customize), so a hand-rolled History API router avoids a routing dependency entirely
 * (a stated PRD dependency-creep concern). Consumers read the current route
 * and navigate exclusively through the {@link useRoute}/{@link useNavigate}
 * hooks — no component touches `window.location` directly.
 *
 * Unknown paths resolve to the Plans section (SPA fallback), matching the
 * server's `index.html` fallback contract so deep links and refreshes work.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Logical app sections the router can resolve. */
export type RouteSection =
  | 'plans'
  | 'planDetail'
  | 'archive'
  | 'customize'
  | 'customizeDetail'
  | 'taskDetail';

/** A resolved route: the active section plus any parsed path params. */
export interface Route {
  section: RouteSection;
  params: { id?: string; taskId?: string; kind?: string };
}

/**
 * Pure path parser. Maps a `pathname` to a {@link Route}. Anything that does
 * not match a known pattern falls back to the Plans section (no throw), which
 * is the SPA fallback contract.
 */
export function parsePath(pathname: string): Route {
  const taskDetail = /^\/plans\/([^/]+)\/tasks\/([^/]+)\/?$/.exec(pathname);
  if (taskDetail && taskDetail[1] && taskDetail[2]) {
    return { section: 'taskDetail', params: { id: taskDetail[1], taskId: taskDetail[2] } };
  }
  const planDetail = /^\/plans\/([^/]+)\/?$/.exec(pathname);
  if (planDetail && planDetail[1]) {
    return { section: 'planDetail', params: { id: planDetail[1] } };
  }
  if (pathname === '/archive' || pathname === '/archive/') {
    return { section: 'archive', params: {} };
  }
  const customizeDetail = /^\/customize\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (customizeDetail && customizeDetail[1] && customizeDetail[2]) {
    return {
      section: 'customizeDetail',
      params: { kind: customizeDetail[1], id: customizeDetail[2] },
    };
  }
  if (pathname === '/customize' || pathname === '/customize/') {
    return { section: 'customize', params: {} };
  }
  // '/' and everything else → Plans (SPA fallback).
  return { section: 'plans', params: {} };
}

interface RouterContextValue {
  route: Route;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Holds the current route in state, initialized from the current URL, kept in
 * sync with browser back/forward via `popstate`, and updated on `navigate`
 * through `history.pushState` (no full-page reload).
 */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    setRoute(parsePath(path));
  }, []);

  const value = useMemo<RouterContextValue>(() => ({ route, navigate }), [route, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouterContext(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRoute/useNavigate must be used within a <RouterProvider>');
  }
  return ctx;
}

/** Returns the current resolved {@link Route}. */
export function useRoute(): Route {
  return useRouterContext().route;
}

/** Returns the `navigate(path)` action that updates the URL and route state. */
export function useNavigate(): (path: string) => void {
  return useRouterContext().navigate;
}
