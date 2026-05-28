/**
 * Server-Sent Events change stream for `npx strikethroo serve`.
 *
 * Provides `GET /api/events`: a `text/event-stream` that broadcasts a single
 * coalesced `changed` ping whenever the workspace mutates on disk. The event
 * carries no diff payload — clients refetch the affected API data (the browser
 * consumer is a later plan).
 *
 * Exposes an {@link EventsHub} that owns the connected-client set and the
 * workspace watcher, plus an `ApiHandler` the server registers so this module
 * stays decoupled from routing. Connections are cleaned up on disconnect so no
 * listeners or sockets leak. Node built-ins only.
 */

import * as http from 'http';
import { createWorkspaceWatcher, WorkspaceWatcher } from './watcher';

/** Keep-alive comment interval (ms) to hold idle proxies/streams open. */
const KEEP_ALIVE_MS = 15000;

/**
 * Owns the SSE client set and the workspace watcher. One hub per server. Start
 * the watcher with {@link start} after the server is listening; release it with
 * {@link close} when the server closes.
 */
export class EventsHub {
  private readonly clients = new Set<http.ServerResponse>();
  private watcher: WorkspaceWatcher | null = null;

  constructor(
    private readonly workspaceDir: string,
    private readonly debounceMs?: number
  ) {}

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
    for (const res of this.clients) {
      res.end();
    }
    this.clients.clear();
  }

  /** Number of currently connected SSE clients (used by tests). */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Sends a single coalesced `changed` event to every connected client. */
  private broadcast(): void {
    for (const res of this.clients) {
      res.write('event: changed\ndata: {}\n\n');
    }
  }

  /** Attaches an SSE response: writes headers, registers cleanup on close. */
  handleConnection(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    // Initial comment opens the stream and flushes headers to the client.
    res.write(': connected\n\n');

    this.clients.add(res);

    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, KEEP_ALIVE_MS);
    // Don't let the keep-alive timer hold the event loop / process open.
    keepAlive.unref?.();

    const cleanup = (): void => {
      clearInterval(keepAlive);
      this.clients.delete(res);
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
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
