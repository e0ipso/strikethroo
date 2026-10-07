/**
 * Live SSE connection layer for the Strikethroo SPA (Plan 92, Task 001 —
 * Section A of the live-update pipeline).
 *
 * Maintains a single, resilient `EventSource` to `/api/events` for the lifetime
 * of the SPA, created once at the application root and shared via React context.
 * It exposes three things to the rest of the app:
 *
 *   1. an observable connection state (`connecting` | `connected` |
 *      `reconnecting`),
 *   2. a subscribe-able `changed` signal that fires when the server emits its
 *      coalesced `changed` event, and
 *   3. a subscribe-able `reconnected` signal that fires when the stream opens
 *      again after a drop. SSE replays nothing, so a change written while the
 *      stream was down never arrives as `changed`; the revalidation seam reads
 *      this signal as one.
 *
 * Deliberately thin: this layer only signals. It performs NO data fetching —
 * routing either signal into scoped revalidation is the revalidation seam's
 * job (`revalidation.tsx`). The server
 * (Plan 84) owns the watcher, the debounce, and the named `changed` event; this
 * is strictly the client consumer plus a bounded auto-reconnect that covers the
 * cases the browser's native `EventSource` reconnect does not (notably a full
 * server restart) and drives the `reconnecting` indicator state.
 *
 * No new runtime dependency is added — `EventSource` is browser-native.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** The SSE endpoint the server (Plan 84) exposes. */
const EVENTS_URL = '/api/events';

/** The named server event signalling a coalesced workspace change (Plan 84). */
const CHANGED_EVENT = 'changed';

/** Backoff base delay (ms); first reconnect waits roughly this long. */
const BACKOFF_BASE_MS = 500;

/** Backoff ceiling (ms); the delay never grows past this cap. */
const BACKOFF_CAP_MS = 15000;

/**
 * Observable connection state.
 * - `connecting`   — transient, first open before the stream is established.
 * - `connected`    — the stream is open and healthy.
 * - `reconnecting` — the stream dropped and we are backing off / retrying.
 */
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting';

/** A signal listener. Receives no payload — the signal simply fired. */
type SignalListener = () => void;

interface LiveConnectionValue {
  /** The current connection state, reactive. */
  state: ConnectionState;
  /**
   * Subscribe to the coalesced `changed` signal. Returns an unsubscribe
   * function. Consumers react by revalidating; the connection layer itself
   * never fetches.
   */
  subscribe: (listener: SignalListener) => () => void;
  /**
   * Subscribe to the `reconnected` signal: the stream opened again after a
   * drop. The page-load open does not fire it. Returns an unsubscribe function.
   */
  subscribeReconnected: (listener: SignalListener) => () => void;
}

const LiveConnectionContext = createContext<LiveConnectionValue | null>(null);

/**
 * Computes the bounded exponential-backoff delay for a given attempt count:
 * `min(base * 2^attempt, cap)`. Attempt 0 yields the base delay.
 */
function backoffDelay(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
}

/** Adds `listener` to a registry; returns the matching unsubscribe. */
function addListener(listeners: Set<SignalListener>, listener: SignalListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Calls every listener in a registry. Snapshot to an array so a listener that
 * unsubscribes during dispatch does not perturb live iteration over the Set.
 */
function notify(listeners: Set<SignalListener>): void {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

/**
 * Provides the shared SSE connection. Mount once at the application root so a
 * single `EventSource` is shared across every screen (no per-screen duplicate
 * streams).
 */
export function LiveConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>('connecting');

  // Listener registries. Refs (not state) so subscribing does not re-render
  // and the EventSource effect never re-runs on subscription churn.
  const changedListenersRef = useRef<Set<SignalListener>>(new Set());
  const reconnectedListenersRef = useRef<Set<SignalListener>>(new Set());

  const subscribe = useCallback(
    (listener: SignalListener) => addListener(changedListenersRef.current, listener),
    []
  );
  const subscribeReconnected = useCallback(
    (listener: SignalListener) => addListener(reconnectedListenersRef.current, listener),
    []
  );

  useEffect(() => {
    let disposed = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    // Set by a drop, cleared by the open that follows it. Only such an open
    // fires `reconnected`: the page-load open (and any open with no error
    // before it) fires nothing, because the resources' own first fetch already
    // covers it. Failed retries never open, so one recovery is one signal.
    let interrupted = false;

    const clearReconnect = (): void => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = (): void => {
      if (disposed || reconnectTimer !== null) return;
      const delay = backoffDelay(attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    function connect(): void {
      if (disposed) return;

      // Tear down any stale source before opening a fresh one. This is what lets
      // us recover from a full server restart, which native reconnect alone may
      // not cleanly recover from.
      if (source) {
        source.close();
        source = null;
      }

      const es = new EventSource(EVENTS_URL);
      source = es;

      es.onopen = (): void => {
        if (disposed) return;
        attempt = 0; // reset backoff on a healthy open
        setState('connected');
        if (interrupted) {
          interrupted = false;
          notify(reconnectedListenersRef.current);
        }
      };

      // Listen specifically for the named server event; ignore other frames.
      es.addEventListener(CHANGED_EVENT, () => {
        if (disposed) return;
        notify(changedListenersRef.current);
      });

      es.onerror = (): void => {
        if (disposed) return;
        interrupted = true;
        // The browser sets readyState to CLOSED when it has given up; CONNECTING
        // means the native layer is itself retrying. Either way we surface
        // `reconnecting` and drive an explicit bounded-backoff reconnect so the
        // indicator is honest and a server restart is recovered.
        setState('reconnecting');
        es.close();
        if (source === es) source = null;
        scheduleReconnect();
      };
    }

    setState('connecting');
    connect();

    return () => {
      disposed = true;
      clearReconnect();
      if (source) {
        source.close();
        source = null;
      }
    };
  }, []);

  return (
    <LiveConnectionContext.Provider value={{ state, subscribe, subscribeReconnected }}>
      {children}
    </LiveConnectionContext.Provider>
  );
}

/**
 * Returns the shared live-connection value (state + both `subscribe`s). Throws if used
 * outside a {@link LiveConnectionProvider}, matching the router's contract.
 */
export function useLiveConnection(): LiveConnectionValue {
  const ctx = useContext(LiveConnectionContext);
  if (!ctx) {
    throw new Error('useLiveConnection must be used within a <LiveConnectionProvider>');
  }
  return ctx;
}

/** Convenience accessor for just the connection state (the indicator's input). */
export function useConnectionState(): ConnectionState {
  return useLiveConnection().state;
}
