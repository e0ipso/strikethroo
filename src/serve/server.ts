/**
 * Core HTTP server for `npx strikethroo serve`.
 *
 * Composes three concerns over the workspace model (`workspace-model.ts`):
 *   - static hosting of the prebuilt SPA, with directory-traversal protection
 *     and an `index.html` fallback so client-side routing resolves;
 *   - a read-only JSON API (`/api/plans`, `/api/plans/:id`, `/api/config`,
 *     `/api/capabilities`) read fresh per request so responses reflect current
 *     disk state;
 *   - `POST /api/plans/:id/archive`, the one sanctioned workspace mutation:
 *     it moves a `done` plan's directory from `plans/` to `archive/`;
 *   - the non-read endpoint `POST /api/self-review`, which launches the
 *     external self-review binary for a validated in-workspace plan path;
 *   - platform-aware browser auto-open on startup.
 *
 * The server is local-only by construction: it binds loopback, and every
 * request — static, API, and the `apiHandlers` extension point — passes through
 * {@link guardRequest} (Host authority, request-target parsing) and a single
 * exception boundary before any route runs. Routes are matched by path first
 * and method second, so a wrong method answers `405` and a mutation path never
 * reaches a read handler. Body-bearing mutations require `application/json`.
 *
 * Mutations are additionally gated on a per-start capability: a random token
 * minted in {@link startServer}, handed out only by `GET /api/session` to a
 * same-origin request, and required in {@link CAPABILITY_HEADER}. Together with
 * the Origin/fetch-metadata check this closes CSRF and DNS-rebinding paths from
 * a browser. It is a browser/request safeguard only: it does not isolate the
 * server from another local process that can already read the user's files
 * (and so the token). No cookies, no accounts, no CORS — the token lives in
 * the page's memory and is never persisted, logged, or placed in a URL.
 *
 * The SSE change stream (`GET /api/events`) is added by a separate module that
 * hooks into the `apiHandlers` extension point below, so this module stays free
 * of file-watching concerns. Node built-ins only — no runtime dependency, no
 * Vite/React/Tailwind imports.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { URL } from 'url';
import { getWorkspaceModel, getPlanDetail, getConfig } from './workspace-model';
import { EventsHub } from './events';
import { isSelfReviewAvailable, launchSelfReview, LaunchDeps } from './self-review';
import { archivePlan } from './archive';
import { writeConfigFile } from './config-write';

/** Options for {@link startServer}. */
export interface ServeOptions {
  /** Absolute path of the `.ai/strikethroo` workspace directory to serve. */
  root: string;
  /** Port to bind. `0` selects an ephemeral free port (used by tests). */
  port: number;
  /** When `false`, do not open the browser on startup. */
  open: boolean;
  /** Absolute path of the prebuilt SPA assets directory. */
  assetsDir: string;
  /**
   * Optional extra API route handlers, tried before the built-in read endpoints
   * and the built-in SSE stream. A handler returns `true` once it has taken
   * ownership of the response, `false` to fall through.
   */
  apiHandlers?: ApiHandler[];
  /**
   * Debounce quiet window (ms) for the change watcher. Defaults to the watcher
   * module's default; exposed mainly so tests can tighten it.
   */
  debounceMs?: number;
  /**
   * Loopback address to bind. Defaults to `127.0.0.1`, falling back to `::1`
   * when the platform has no IPv4 loopback. Test-only; deliberately not a CLI
   * flag — the viewer is never served beyond the local machine.
   */
  host?: string;
  /**
   * Seams for the self-review launcher (availability probe and spawn).
   * Test-only: lets a suite prove a rejected request launched nothing.
   */
  selfReviewDeps?: LaunchDeps;
}

/** A pluggable `/api/*` handler. Returns `true` if it handled the request. */
export type ApiHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: { root: string; pathname: string }
) => boolean;

/** Result of a successful {@link startServer} call. */
export interface ServeHandle {
  url: string;
  server: http.Server;
  port: number;
  /** The SSE change-stream hub backing `GET /api/events`. */
  events: EventsHub;
  /**
   * This instance's mutation capability. Test-only: production callers (the
   * CLI) must never print, log, or persist it; the SPA obtains it from
   * `GET /api/session`.
   */
  capability?: string;
}

/** Request header carrying the mutation capability. */
export const CAPABILITY_HEADER = 'X-Strikethroo-Capability';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

const mimeFor = (filePath: string): string =>
  MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

/**
 * Derives the hosting project's identity from the workspace root. `root` is the
 * `.ai/strikethroo` directory (`<project>/.ai/strikethroo`), so the project is
 * two levels up; its basename is the display name and its absolute path is the
 * tooltip. Falls back to the root itself for a non-standard layout (e.g. a test
 * fixture that is not nested under `.ai/strikethroo`).
 */
const deriveProject = (root: string): { name: string; path: string } => {
  const parent = path.dirname(root);
  const grandparent = path.dirname(parent);
  const isStandard = path.basename(root) === 'strikethroo' && path.basename(parent) === '.ai';
  const projectPath = isStandard ? grandparent : root;
  return { name: path.basename(projectPath), path: projectPath };
};

/**
 * Resolves the default prebuilt SPA assets directory relative to the installed
 * package. The compiled server lives at `<pkg>/dist/serve/server.js`, so the
 * package root is two levels up and the Plan 82 Vite output is `<pkg>/dist-web`.
 * Plan 94 finalizes the shipped asset path; this is the local-dev default.
 */
export const defaultAssetsDir = (): string => path.resolve(__dirname, '..', '..', 'dist-web');

const sendJson = (
  res: http.ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
};

/**
 * Sends an error response if one can still be sent. Once headers are out the
 * only honest option is to drop the connection, never a half-written body.
 */
const sendError = (res: http.ServerResponse, status: number, body: unknown): void => {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  sendJson(res, status, body);
};

// ---------------------------------------------------------------------------
// Request guard
// ---------------------------------------------------------------------------

/** What the request handler knows about the running server; fixed after `listen`. */
export interface GuardContext {
  /** Lower-case `host[:port]` authorities this server answers for. */
  allowedHosts: ReadonlySet<string>;
  /** The per-start mutation capability (see the module comment). */
  capability: string;
}

/**
 * Outcome of {@link guardRequest} and the per-route guards: the parsed path to
 * route, or a complete rejection the caller writes verbatim.
 */
export type GuardResult =
  | { ok: true; pathname: string }
  | { ok: false; status: number; body: unknown; headers?: Record<string, string> };

const reject = (status: number, error: string): GuardResult => ({
  ok: false,
  status,
  body: { error },
});

const BAD_REQUEST = reject(400, 'Bad request.');
const MISDIRECTED = reject(421, 'Misdirected request.');
const FORBIDDEN = reject(403, 'Forbidden.');

/**
 * Runs before routing, for every request. Refuses any `Host` that is not one
 * of the server's own loopback authorities (DNS-rebinding defense), then parses
 * the request target: origin-form (`/path`) or absolute-form naming an allowed
 * authority; anything else, including a target whose path does not
 * percent-decode, is a `400`. The returned `pathname` is the only thing routing
 * consumes.
 */
export const guardRequest = (req: http.IncomingMessage, ctx: GuardContext): GuardResult => {
  const host = (req.headers.host ?? '').toLowerCase();
  if (!ctx.allowedHosts.has(host)) return MISDIRECTED;

  const target = req.url ?? '';
  let url: URL;
  try {
    if (target.startsWith('/')) {
      // `//authority/path` is scheme-relative, not origin-form; refuse it so the
      // routed path is never taken from a smuggled authority.
      if (target.startsWith('//')) return BAD_REQUEST;
      url = new URL(target, 'http://127.0.0.1');
    } else {
      url = new URL(target);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return BAD_REQUEST;
      if (!ctx.allowedHosts.has(url.host.toLowerCase())) return MISDIRECTED;
    }
    decodeURIComponent(url.pathname);
  } catch {
    return BAD_REQUEST;
  }
  return { ok: true, pathname: url.pathname };
};

/**
 * Same-origin policy for the session bootstrap and every mutation. The request
 * must carry no cross-site fetch metadata (`Sec-Fetch-Site` absent, `same-origin`
 * or `none` — a page we served, or a direct navigation) and any `Origin` present
 * must be `http://<allowed authority>`. `same-site`, `cross-site`, `null`, and a
 * foreign or https Origin are all refused. Both headers are forbidden request
 * headers in browsers, so a page cannot forge them; non-browser callers are
 * what the capability is for.
 */
const guardSameOrigin = (req: http.IncomingMessage, ctx: GuardContext): GuardResult | null => {
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return FORBIDDEN;
  const origin = req.headers.origin;
  if (origin === undefined) return null;
  const lower = origin.toLowerCase();
  for (const host of ctx.allowedHosts) {
    if (lower === `http://${host}`) return null;
  }
  return FORBIDDEN;
};

/** Constant-time check that {@link CAPABILITY_HEADER} carries this instance's token. */
const guardCapability = (req: http.IncomingMessage, ctx: GuardContext): GuardResult | null => {
  const header = req.headers[CAPABILITY_HEADER.toLowerCase()];
  if (typeof header !== 'string') return FORBIDDEN;
  const presented = Buffer.from(header);
  const expected = Buffer.from(ctx.capability);
  if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) {
    return FORBIDDEN;
  }
  return null;
};

/** True when `Content-Type` is `application/json`, any case, parameters allowed. */
const isJson = (req: http.IncomingMessage): boolean => {
  const header = req.headers['content-type'];
  if (typeof header !== 'string') return false;
  const mediaType = header.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json';
};

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** The composite plan key grammar: `{id}--{slug}`, e.g. `28--plan-name`. */
const COMPOSITE_KEY = /^[0-9]+--[a-z0-9-]+$/;

/**
 * Validates a captured route segment as a composite plan key (`{id}--{slug}`).
 * URL-decodes exactly once, then accepts the result only if it is non-empty,
 * carries no path separator (`/`, `\`), no `..`, no NUL byte, no leading `.`,
 * and matches the composite grammar. The grammar already excludes separators
 * and dots; the explicit checks are defense-in-depth. Returns the validated key
 * string, or `null`. No path is ever constructed from the segment.
 */
const validateCompositeKey = (segment: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  if (decoded === '') return null;
  if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('..')) return null;
  if (decoded.includes('\0')) return null;
  if (decoded.startsWith('.')) return null;
  if (!COMPOSITE_KEY.test(decoded)) return null;
  return decoded;
};

/** Parses `/api/plans/:key` -> composite key, or `null` if it fails validation. */
const parsePlanId = (pathname: string): string | null => {
  const match = /^\/api\/plans\/([^/]+)\/?$/.exec(pathname);
  if (!match || match[1] === undefined) return null;
  return validateCompositeKey(match[1]);
};

/** Parses `/api/plans/:key/archive` -> composite key, or `null` if it fails validation. */
const parseArchivePlanId = (pathname: string): string | null => {
  const match = /^\/api\/plans\/([^/]+)\/archive\/?$/.exec(pathname);
  if (!match || match[1] === undefined) return null;
  return validateCompositeKey(match[1]);
};

/**
 * Max accepted request-body size (bytes). The self-review body is tiny JSON,
 * but the config-write route carries whole markdown files, which can exceed
 * 64 KiB once edited — so the cap is 1 MiB.
 */
const MAX_BODY_BYTES = 1024 * 1024;

/** A body-reading failure that already knows its HTTP status. */
class BodyError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Reads and JSON-parses a request body. Rejects with a {@link BodyError}: `413`
 * when the declared or actual size exceeds {@link MAX_BODY_BYTES}, `400` when
 * the body is empty or not JSON. An oversized body is answered, not reset, so
 * the client sees the `413`; Node drains the remainder after the response.
 */
const readJsonBody = (req: http.IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const tooLarge = new BodyError(413, 'Request body too large');
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      reject(tooLarge);
      return;
    }
    let size = 0;
    let failed = false;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        failed = true;
        chunks.length = 0;
        reject(tooLarge);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw === '') {
        reject(new BodyError(400, 'Request body must be a JSON document'));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new BodyError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

const bodyErrorStatus = (err: unknown): number => (err instanceof BodyError ? err.status : 500);

/** Everything a route handler may need; `pathname` comes from the guard. */
interface RouteContext {
  root: string;
  pathname: string;
  events: EventsHub;
  guard: GuardContext;
  selfReviewDeps?: LaunchDeps;
}

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RouteContext
) => void;

interface Route {
  pattern: RegExp;
  /** Accepted methods, also the `Allow` header on a `405`. */
  methods: readonly string[];
  /** When set, the request must pass {@link guardSameOrigin} (`403` otherwise). */
  sameOrigin?: true;
  /**
   * A workspace mutation or process launch: implies `sameOrigin` and requires
   * {@link CAPABILITY_HEADER} (`403` otherwise). Both run before the media-type
   * check and before any body is read.
   */
  mutation?: true;
  /** When set, the request must carry `Content-Type: application/json` (`415` otherwise). */
  requiresJson?: true;
  handle: RouteHandler;
}

const READ_METHODS = ['GET', 'HEAD'] as const;

/** Malformed workspace data is a concise `500`, never a stack trace. */
const sendReadFailure = (res: http.ServerResponse, err: unknown): void => {
  sendJson(res, 500, {
    error: `Failed to read workspace: ${err instanceof Error ? err.message : String(err)}`,
  });
};

/** Wraps a synchronous workspace read as a `200` JSON route. */
const readRoute =
  (read: (ctx: RouteContext) => unknown): RouteHandler =>
  (_req, res, ctx) => {
    let body: unknown;
    try {
      body = read(ctx);
    } catch (err) {
      sendReadFailure(res, err);
      return;
    }
    sendJson(res, 200, body);
  };

const handlePlanDetail: RouteHandler = (_req, res, ctx) => {
  const key = parsePlanId(ctx.pathname);
  if (key === null) {
    sendJson(res, 404, { error: 'Invalid plan id' });
    return;
  }
  let detail: ReturnType<typeof getPlanDetail>;
  try {
    detail = getPlanDetail(ctx.root, key);
  } catch (err) {
    sendReadFailure(res, err);
    return;
  }
  if (!detail) {
    sendJson(res, 404, { error: `Plan ${key} not found` });
    return;
  }
  sendJson(res, 200, detail);
};

/**
 * Handles `POST /api/plans/:id/archive`: delegates entirely to the {@link
 * archivePlan} operation and maps its discriminated result to status codes
 * without duplicating validation. A JSON body is required; `{}` is enough.
 */
const handleArchive: RouteHandler = (req, res, ctx) => {
  const key = parseArchivePlanId(ctx.pathname);
  if (key === null) {
    sendJson(res, 400, { error: 'Invalid plan id.' });
    return;
  }

  readJsonBody(req)
    .then(() => archivePlan(ctx.root, key))
    .then(result => {
      if (result.ok) {
        sendJson(res, 200, result.plan);
        return;
      }
      switch (result.reason) {
        case 'not-found':
          sendJson(res, 404, { error: result.message });
          return;
        case 'not-done':
        case 'already-archived':
        case 'destination-exists':
          sendJson(res, 409, { error: result.message });
          return;
        default:
          // fs-error: a safe, fixed message — never leak internals.
          sendJson(res, 500, { error: 'Failed to archive plan.' });
      }
    })
    .catch((err: unknown) => {
      const status = bodyErrorStatus(err);
      sendError(res, status, {
        error: err instanceof BodyError ? err.message : 'Failed to archive plan.',
      });
    });
};

/**
 * Handles `POST /api/self-review`: launches the external self-review binary for
 * the requested plan path.
 */
const handleSelfReview: RouteHandler = (req, res, ctx) => {
  readJsonBody(req)
    .then(body => {
      const clientPath = (body as { path?: unknown }).path;
      const result = launchSelfReview(
        ctx.root,
        typeof clientPath === 'string' ? clientPath : '',
        ctx.selfReviewDeps
      );
      sendJson(res, result.status, result.body);
    })
    .catch((err: unknown) => {
      sendError(res, bodyErrorStatus(err), {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to launch self-review.',
      });
    });
};

/** Parses `/api/config/:kind/:id` -> `{ kind, id }`, or `null` if malformed. */
const parseConfigTarget = (pathname: string): { kind: string; id: string } | null => {
  const match = /^\/api\/config\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match || match[1] === undefined || match[2] === undefined) return null;
  try {
    return { kind: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
};

/**
 * Handles `PUT /api/config/:kind/:id`: reads `{ content }` from the JSON body,
 * delegates to the {@link writeConfigFile} guard, and maps its discriminated
 * result to status codes. On success returns the refreshed config slice so the
 * client can update without a second fetch.
 */
const handleConfigWrite: RouteHandler = (req, res, ctx) => {
  const target = parseConfigTarget(ctx.pathname);
  if (!target) {
    sendJson(res, 400, { error: 'Invalid config path.' });
    return;
  }

  readJsonBody(req)
    .then(body => {
      const content = (body as { content?: unknown }).content;
      if (typeof content !== 'string') {
        sendJson(res, 400, { error: 'Request body must include string "content".' });
        return;
      }
      return writeConfigFile(ctx.root, target.kind, target.id, content).then(result => {
        if (result.ok) {
          sendJson(res, 200, getConfig(ctx.root));
          return;
        }
        switch (result.reason) {
          case 'invalid-kind':
          case 'invalid-id':
            sendJson(res, 400, { error: result.message });
            return;
          case 'not-found':
            sendJson(res, 404, { error: result.message });
            return;
          default:
            // fs-error: a safe, fixed message — never leak internals.
            sendJson(res, 500, { error: 'Failed to write config file.' });
        }
      });
    })
    .catch((err: unknown) => {
      sendError(res, bodyErrorStatus(err), {
        error: err instanceof BodyError ? err.message : 'Failed to write config file.',
      });
    });
};

/**
 * The built-in API, most specific paths first. A path is matched before its
 * method is checked, so a known path with the wrong method is a `405` and a
 * mutation path can never fall through to a read handler.
 */
const API_ROUTES: readonly Route[] = [
  {
    pattern: /^\/api\/plans\/?$/,
    methods: READ_METHODS,
    handle: readRoute(ctx => getWorkspaceModel(ctx.root).plans),
  },
  {
    pattern: /^\/api\/config\/?$/,
    methods: READ_METHODS,
    handle: readRoute(ctx => getConfig(ctx.root)),
  },
  {
    pattern: /^\/api\/capabilities\/?$/,
    methods: READ_METHODS,
    handle: readRoute(ctx => ({
      selfReview: isSelfReviewAvailable(),
      project: deriveProject(ctx.root),
    })),
  },
  {
    pattern: /^\/api\/events\/?$/,
    methods: ['GET'],
    handle: (req, res, ctx) => {
      ctx.events.apiHandler(req, res, { pathname: ctx.pathname });
    },
  },
  {
    // Capability bootstrap: the only response that ever carries the token. A
    // cross-origin page cannot read it (no CORS headers), a cross-site fetch is
    // refused outright, and the Host guard already stopped DNS rebinding.
    pattern: /^\/api\/session\/?$/,
    methods: ['GET'],
    sameOrigin: true,
    handle: (_req, res, ctx) => {
      sendJson(res, 200, { token: ctx.guard.capability }, { 'Cache-Control': 'no-store' });
    },
  },
  {
    pattern: /^\/api\/plans\/[^/]+\/archive\/?$/,
    methods: ['POST'],
    mutation: true,
    requiresJson: true,
    handle: handleArchive,
  },
  {
    pattern: /^\/api\/self-review\/?$/,
    methods: ['POST'],
    mutation: true,
    requiresJson: true,
    handle: handleSelfReview,
  },
  {
    pattern: /^\/api\/config\/[^/]+\/[^/]+\/?$/,
    methods: ['PUT'],
    mutation: true,
    requiresJson: true,
    handle: handleConfigWrite,
  },
  { pattern: /^\/api\/plans\/[^/]+\/?$/, methods: READ_METHODS, handle: handlePlanDetail },
];

/**
 * Routes a guarded `/api/*` request through {@link API_ROUTES}. Check order,
 * after the Host guard that already ran: path, method, Origin and fetch
 * metadata, capability, media type, then the handler — which is the first thing
 * to read the body, touch a file, or launch a process.
 */
const routeApi = (req: http.IncomingMessage, res: http.ServerResponse, ctx: RouteContext): void => {
  const route = API_ROUTES.find(candidate => candidate.pattern.test(ctx.pathname));
  if (!route) {
    sendJson(res, 404, { error: `Unknown API route: ${ctx.pathname}` });
    return;
  }
  if (!route.methods.includes(req.method ?? '')) {
    sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: route.methods.join(', ') });
    return;
  }
  const rejection =
    (route.sameOrigin || route.mutation ? guardSameOrigin(req, ctx.guard) : null) ??
    (route.mutation ? guardCapability(req, ctx.guard) : null);
  if (rejection && !rejection.ok) {
    sendJson(res, rejection.status, rejection.body, rejection.headers);
    return;
  }
  if (route.requiresJson && !isJson(req)) {
    sendJson(res, 415, { error: 'Content-Type must be application/json.' });
    return;
  }
  route.handle(req, res, ctx);
};

/** Streams a static file with an appropriate content type. */
const sendFile = (res: http.ServerResponse, filePath: string): void => {
  res.writeHead(200, { 'Content-Type': mimeFor(filePath) });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  stream.pipe(res);
};

const ASSETS_MISSING_MESSAGE =
  'Web assets not found. Build the web app first (e.g. `npm run build:web`).';

/** Serves the SPA: a real file under the assets root, else the index fallback. */
const handleStatic = (res: http.ServerResponse, assetsDir: string, pathname: string): void => {
  const indexFile = path.join(assetsDir, 'index.html');

  // Resolve the request path under assetsDir and guard against traversal. The
  // guard already proved `pathname` decodes; a throw here is a 400 upstream.
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  const resolved = path.resolve(assetsDir, relative);
  const assetsRoot = path.resolve(assetsDir);
  const withinRoot = resolved === assetsRoot || resolved.startsWith(assetsRoot + path.sep);
  if (!withinRoot) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // A real, non-directory file under the assets root: serve it directly.
  try {
    if (relative !== '' && fs.statSync(resolved).isFile()) {
      sendFile(res, resolved);
      return;
    }
  } catch {
    // Not a file; fall through to the SPA index fallback.
  }

  // SPA fallback: serve index.html for any non-file route so client routing works.
  try {
    if (fs.statSync(indexFile).isFile()) {
      sendFile(res, indexFile);
      return;
    }
  } catch {
    // index.html missing -> assets not built.
  }

  res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(ASSETS_MISSING_MESSAGE);
};

/** Opens the default browser at `url`. Failures are logged, never fatal. */
const openBrowser = (url: string): void => {
  try {
    const platform = process.platform;
    let command: string;
    let args: string[];
    if (platform === 'darwin') {
      command = 'open';
      args = [url];
    } else if (platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {
      /* a failed open must not stop the server */
    });
    child.unref();
  } catch {
    /* non-fatal */
  }
};

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const DEFAULT_HOST = '127.0.0.1';
const IPV6_LOOPBACK = '::1';

/** `host:port` as a browser writes it in `Host`, bracketing IPv6 literals. */
const authorityOf = (address: string, port: number): string =>
  `${address.includes(':') ? `[${address}]` : address}:${port}`;

/**
 * Creates and starts the HTTP server, resolving with the bound URL once it is
 * listening. Rejects only on a genuine listen/bind error.
 */
export const startServer = async (opts: ServeOptions): Promise<ServeHandle> => {
  const extraHandlers = opts.apiHandlers ?? [];
  const events = new EventsHub(opts.root, opts.debounceMs);

  // One capability per start; it lives in this closure and leaves the process
  // only through `GET /api/session` (and the test-only handle field).
  const capability = crypto.randomBytes(32).toString('base64url');

  // `allowedHosts` is filled in once `listen` resolves (port 0 is ephemeral);
  // empty until then, which refuses everything — no request can arrive before
  // that anyway.
  const guardContext: GuardContext = { allowedHosts: new Set(), capability };

  const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    const guard = guardRequest(req, guardContext);
    if (!guard.ok) {
      sendJson(res, guard.status, guard.body, guard.headers);
      return;
    }
    const { pathname } = guard;

    if (pathname.startsWith('/api/')) {
      for (const handler of extraHandlers) {
        if (handler(req, res, { root: opts.root, pathname })) return;
      }
      routeApi(req, res, {
        root: opts.root,
        pathname,
        events,
        guard: guardContext,
        selfReviewDeps: opts.selfReviewDeps,
      });
      return;
    }

    if (!READ_METHODS.includes(req.method as (typeof READ_METHODS)[number])) {
      sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: READ_METHODS.join(', ') });
      return;
    }
    handleStatic(res, opts.assetsDir, pathname);
  };

  // The one exception boundary: a throw anywhere in the synchronous path is a
  // bounded error response, never a dead process. Async handlers own their own
  // `.catch`, each of which ends in `sendError`.
  const server = http.createServer((req, res) => {
    try {
      handleRequest(req, res);
    } catch (err) {
      sendError(res, err instanceof URIError ? 400 : 500, {
        error: err instanceof URIError ? 'Bad request.' : 'Internal server error.',
      });
    }
  });

  // Requests the HTTP parser itself rejects get a minimal 400 and a closed socket.
  server.on('clientError', (err: Error & { code?: string }, socket) => {
    if (err.code === 'ECONNRESET' || !socket.writable) {
      socket.destroy();
      return;
    }
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });

  // Tear the watcher and open client streams down with the server.
  server.on('close', () => events.close());

  const listenOn = (host: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const onError = (err: Error): void => reject(err);
      server.once('error', onError);
      server.listen(opts.port, host, () => {
        server.removeListener('error', onError);
        resolve();
      });
    });

  const preferred = opts.host ?? DEFAULT_HOST;
  try {
    await listenOn(preferred);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (preferred !== DEFAULT_HOST || code !== 'EADDRNOTAVAIL') throw err;
    await listenOn(IPV6_LOOPBACK);
  }

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Server did not bind a TCP address.');
  }
  const boundPort = address.port;
  const bound = authorityOf(address.address, boundPort);
  // `[::1]` is allowed only when it is where the server listens; `127.0.0.1`
  // and `localhost` always are, lower-cased to match the guard's comparison.
  guardContext.allowedHosts = new Set(
    [bound, `${DEFAULT_HOST}:${boundPort}`, `localhost:${boundPort}`].map(a => a.toLowerCase())
  );

  const url = `http://${bound}`;
  events.start();
  if (opts.open) openBrowser(url);
  return { url, server, port: boundPort, events, capability };
};
