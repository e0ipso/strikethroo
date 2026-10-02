/**
 * Server-Sent Events change stream for `npx strikethroo serve`.
 *
 * Provides `GET /api/events`: a `text/event-stream` that broadcasts a single
 * coalesced `changed` ping whenever the workspace mutates on disk. The event
 * carries no diff payload — clients refetch the affected API data.
 *
 * Exposes an {@link EventsHub} that owns the connected-client set and the
 * workspace watcher, plus an `ApiHandler` the server registers so this module
 * stays decoupled from routing. Delivery is bounded per session: at most
 * {@link MAX_SSE_CLIENTS} streams are admitted, a client whose socket stops
 * accepting data is written to only once more (one coalesced `changed` on
 * `drain`), and one still blocked after {@link BLOCKED_TIMEOUT_MS} is ended and
 * removed. Disconnect and {@link EventsHub.close} release every per-client
 * timer and listener so nothing leaks. Node built-ins only.
 */

import * as http from 'http';
import { createWorkspaceWatcher, WorkspaceWatcher } from './watcher';

/** Keep-alive comment interval (ms) to hold idle proxies/streams open. */
export const KEEP_ALIVE_MS = 15000;

/** Upper bound on concurrently connected SSE clients per hub. */
export const MAX_SSE_CLIENTS = 16;

/** How long (ms) a client may stay blocked on backpressure before it is dropped. */
export const BLOCKED_TIMEOUT_MS = 30000;

/** `Retry-After` (seconds) sent with the `503` for a refused connection. */
const RETRY_AFTER_SECONDS = 5;

const CHANGED_EVENT = 'event: changed\ndata: {}\n\n';
const KEEP_ALIVE_COMMENT = ': keep-alive\n\n';

/** The compiled bounds; tests shorten them through the constructor. */
export interface EventsHubLimits {
  maxClients: number;
  blockedTimeoutMs: number;
  keepAliveMs: number;
}

/** Per-client delivery state; owned by the hub, discarded on cleanup. */
interface ClientState {
  /** `write()` reported backpressure and `drain` has not arrived since. */
  blocked: boolean;
  /** A broadcast was skipped while blocked; one `changed` is owed on `drain`. */
  pending: boolean;
  keepAlive: ReturnType<typeof setInterval>;
  /** Armed while blocked; drops the client when it fires. */
  slowTimer: ReturnType<typeof setTimeout> | null;
  onDrain: () => void;
  cleanup: () => void;
}

/**
 * Owns the SSE client set and the workspace watcher. One hub per server. Start
 * the watcher with {@link start} after the server is listening; release it with
 * {@link close} when the server closes.
 */
export class EventsHub {
  private readonly clients = new Map<http.ServerResponse, ClientState>();
  private watcher: WorkspaceWatcher | null = null;
  private readonly limits: EventsHubLimits;

  constructor(
    private readonly workspaceDir: string,
    private readonly debounceMs?: number,
    limits: Partial<EventsHubLimits> = {}
  ) {
    this.limits = {
      maxClients: limits.maxClients ?? MAX_SSE_CLIENTS,
      blockedTimeoutMs: limits.blockedTimeoutMs ?? BLOCKED_TIMEOUT_MS,
      keepAliveMs: limits.keepAliveMs ?? KEEP_ALIVE_MS,
    };
  }

  /** Begins watching the workspace; coalesced changes broadcast to all clients. */
  start(): void {
    if (this.watcher) return;
    this.watcher = createWorkspaceWatcher(
      this.workspaceDir,
      () => this.broadcast(),
      this.debounceMs
    );
  }

  /** Stops the watcher and ends every open client connection. */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const [res, state] of [...this.clients]) {
      state.cleanup();
      // A blocked socket cannot flush an `end()`; drop it instead.
      if (state.blocked) res.destroy();
      else res.end();
    }
  }

  /** Number of currently connected SSE clients (used by tests). */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Number of connected clients currently held back by backpressure. */
  get blockedClientCount(): number {
    let count = 0;
    for (const state of this.clients.values()) if (state.blocked) count += 1;
    return count;
  }

  /**
   * Sends a single coalesced `changed` event to every connected client. A
   * blocked client is owed exactly one `changed` on `drain`, however many
   * broadcasts it misses. Called by the watcher; public so tests can drive the
   * stream without touching disk.
   */
  broadcast(): void {
    for (const [res, state] of this.clients) {
      if (state.blocked) state.pending = true;
      else this.send(res, state, CHANGED_EVENT);
    }
  }

  /**
   * Writes one chunk, honoring backpressure: when `write()` returns `false` the
   * client is marked blocked, further writes are skipped, a `drain` listener is
   * armed to resume, and the slow timer starts.
   */
  private send(res: http.ServerResponse, state: ClientState, chunk: string): void {
    if (state.blocked) return;
    if (res.write(chunk)) return;
    state.blocked = true;
    res.once('drain', state.onDrain);
    state.slowTimer = setTimeout(() => {
      state.cleanup();
      res.destroy();
    }, this.limits.blockedTimeoutMs);
    state.slowTimer.unref?.();
  }

  /** Attaches an SSE response, or refuses it with `503` when at capacity. */
  handleConnection(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (this.clients.size >= this.limits.maxClients) {
      const body = JSON.stringify({ error: 'Too many event-stream clients.' });
      res.writeHead(503, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Retry-After': String(RETRY_AFTER_SECONDS),
      });
      res.end(body);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const state: ClientState = {
      blocked: false,
      pending: false,
      keepAlive: setInterval(
        () => this.send(res, state, KEEP_ALIVE_COMMENT),
        this.limits.keepAliveMs
      ),
      slowTimer: null,
      onDrain: () => {
        if (!this.clients.has(res)) return;
        state.blocked = false;
        if (state.slowTimer) {
          clearTimeout(state.slowTimer);
          state.slowTimer = null;
        }
        if (state.pending) {
          state.pending = false;
          this.send(res, state, CHANGED_EVENT);
        }
      },
      cleanup: () => {
        if (!this.clients.delete(res)) return;
        clearInterval(state.keepAlive);
        if (state.slowTimer) clearTimeout(state.slowTimer);
        res.removeListener('drain', state.onDrain);
        req.removeListener('close', state.cleanup);
        res.removeListener('close', state.cleanup);
      },
    };
    // Don't let the keep-alive timer hold the event loop / process open.
    state.keepAlive.unref?.();
    this.clients.set(res, state);
    req.on('close', state.cleanup);
    res.on('close', state.cleanup);

    // Initial comment opens the stream and flushes headers to the client.
    this.send(res, state, ': connected\n\n');
  }

  /** An {@link ApiHandler} for `GET /api/events`; returns false otherwise. */
  apiHandler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    ctx: { pathname: string }
  ): boolean => {
    if (ctx.pathname === '/api/events' || ctx.pathname === '/api/events/') {
      this.handleConnection(req, res);
      return true;
    }
    return false;
  };
}
