/**
 * Client coalescing + scoped revalidation seam (Plan 92, Task 002 — Section B
 * of the live-update pipeline).
 *
 * Translates the possibly-bursty `changed` signal from the connection layer
 * (Task 001) into at most one revalidation pass per quiet window, and exposes a
 * reactive "revalidation token" that the existing fetch layer
 * (`data/api.ts#useResource`) folds into its effect dependencies. When the token
 * bumps, every currently-mounted resource re-reads its endpoint.
 *
 * Scoping falls out of React's mount tree rather than a bespoke route switch:
 * `useResource` only runs for mounted components, so a token bump re-fetches
 * exactly the resources the active view depends on —
 *   - the Plans list is always eligible (the Sidebar's `usePlans` is always
 *     mounted, and the Plans screen mounts its own),
 *   - the open Plan Detail re-reads only when a detail route is mounted, and
 *   - Config re-reads only when the Customize screen is mounted.
 * Because the bump targets whatever is mounted *now*, the open-detail
 * revalidation always targets the currently active plan id — no stale closure
 * over an id captured at subscription time.
 *
 * This seam owns NO cache: the read endpoints remain the source of truth; the
 * token merely triggers a re-read. The coalescing window collapses a burst
 * (reconnect replay / network buffering) into a single pass. A monotonically
 * increasing pass counter is exposed for observability so the integration tests
 * (Task 004) can assert coalescing rather than one-fetch-per-write.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveConnection } from './liveConnection';

/** Trailing-edge coalescing window (ms). Bursts within it collapse to one pass. */
const COALESCE_WINDOW_MS = 200;

interface RevalidationValue {
  /**
   * Reactive token bumped once per coalesced revalidation pass. Resources fold
   * it into their fetch effect dependencies to re-read when it changes.
   */
  token: number;
  /**
   * Force an immediate revalidation pass (bypasses the coalescing window). Used
   * by the "Live" control (Task 003) to snap to current state on activation.
   */
  revalidateNow: () => void;
  /**
   * Observability hook: the total number of revalidation passes performed since
   * mount. Exposed on `window.__stRevalidationCount` too (see below) so the
   * Playwright integration tests can assert burst coalescing.
   */
  passCount: number;
}

const RevalidationContext = createContext<RevalidationValue | null>(null);

/**
 * Provides the coalescing + revalidation seam. Subscribes to Task 001's
 * `changed` signal and, on a trailing-edge debounce, bumps the revalidation
 * token. Mount inside both the live-connection provider and the router so
 * mounted screens can read the token.
 */
export function RevalidationProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useLiveConnection();
  const [token, setToken] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One revalidation pass: bump the token (re-reads mounted resources) and the
  // observable pass counter.
  const runPass = useCallback(() => {
    setToken(t => t + 1);
    setPassCount(c => {
      const next = c + 1;
      // Mirror onto the window so Playwright can read it without app hooks.
      (window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount = next;
      return next;
    });
  }, []);

  const revalidateNow = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runPass();
  }, [runPass]);

  useEffect(() => {
    // Trailing-edge debounce: each `changed` (re)starts the window; the pass
    // runs only after the window elapses with no further events.
    const unsubscribe = subscribe(() => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        runPass();
      }, COALESCE_WINDOW_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [subscribe, runPass]);

  const value = useMemo<RevalidationValue>(
    () => ({ token, revalidateNow, passCount }),
    [token, revalidateNow, passCount]
  );

  return <RevalidationContext.Provider value={value}>{children}</RevalidationContext.Provider>;
}

/**
 * Returns the reactive revalidation token. Resources fold this into their fetch
 * effect dependencies so a coalesced `changed` event triggers a re-read. Returns
 * `0` when no provider is present (e.g. the `?gallery=1` harness), so resources
 * degrade to a one-shot fetch rather than throwing.
 */
export function useRevalidationToken(): number {
  return useContext(RevalidationContext)?.token ?? 0;
}

/**
 * Returns the full revalidation seam (token + `revalidateNow` + `passCount`).
 * Throws outside a provider, matching the router/connection contract — used by
 * the "Live" control which legitimately requires the seam.
 */
export function useRevalidation(): RevalidationValue {
  const ctx = useContext(RevalidationContext);
  if (!ctx) {
    throw new Error('useRevalidation must be used within a <RevalidationProvider>');
  }
  return ctx;
}
