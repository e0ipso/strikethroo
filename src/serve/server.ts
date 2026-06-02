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
 * The SSE change stream (`GET /api/events`) is added by a separate module that
 * hooks into the `apiHandlers` extension point below, so this module stays free
 * of file-watching concerns. Node built-ins only — no runtime dependency, no
 * Vite/React/Tailwind imports.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { URL } from 'url';
import { getWorkspaceModel, getPlanDetail, getConfig } from './workspace-model';
import { EventsHub } from './events';
import { isSelfReviewAvailable, launchSelfReview } from './self-review';
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
}

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

const sendJson = (res: http.ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

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
 * Handles `POST /api/plans/:id/archive`: delegates entirely to the {@link
 * archivePlan} operation and maps its discriminated result to status codes
 * without duplicating validation. Returns `true` once it owns the response.
 */
const handleArchive = (res: http.ServerResponse, root: string, pathname: string): boolean => {
  const key = parseArchivePlanId(pathname);
  if (key === null) {
    sendJson(res, 400, { error: 'Invalid plan id.' });
    return true;
  }

  archivePlan(root, key)
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
    .catch(() => {
      sendJson(res, 500, { error: 'Failed to archive plan.' });
    });
  return true;
};

/** Handles the built-in read-only API. Returns `true` when the request matched. */
const handleApi = (res: http.ServerResponse, root: string, pathname: string): boolean => {
  try {
    if (pathname === '/api/plans' || pathname === '/api/plans/') {
      sendJson(res, 200, getWorkspaceModel(root).plans);
      return true;
    }

    if (pathname === '/api/config' || pathname === '/api/config/') {
      sendJson(res, 200, getConfig(root));
      return true;
    }

    if (pathname === '/api/capabilities' || pathname === '/api/capabilities/') {
      sendJson(res, 200, { selfReview: isSelfReviewAvailable(), project: deriveProject(root) });
      return true;
    }

    if (/^\/api\/plans\/[^/]+\/?$/.test(pathname)) {
      const key = parsePlanId(pathname);
      if (key === null) {
        sendJson(res, 404, { error: 'Invalid plan id' });
        return true;
      }
      const detail = getPlanDetail(root, key);
      if (!detail) {
        sendJson(res, 404, { error: `Plan ${key} not found` });
        return true;
      }
      sendJson(res, 200, detail);
      return true;
    }

    return false;
  } catch (err) {
    // Malformed workspace data: concise message, never a raw stack trace.
    sendJson(res, 500, {
      error: `Failed to read workspace: ${err instanceof Error ? err.message : String(err)}`,
    });
    return true;
  }
};

/**
 * Max accepted request-body size (bytes). The self-review body is tiny JSON,
 * but the config-write route carries whole markdown files, which can exceed
 * 64 KiB once edited — so the cap is 1 MiB.
 */
const MAX_BODY_BYTES = 1024 * 1024;

/** Reads and JSON-parses a request body, rejecting oversized or malformed input. */
const readJsonBody = (req: http.IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw === '') {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

/**
 * Handles `POST /api/self-review`: launches the external self-review binary for
 * the requested plan path. Returns `true` once it has owned the response.
 */
const handleSelfReview = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  root: string
): boolean => {
  readJsonBody(req)
    .then(body => {
      const clientPath = (body as { path?: unknown }).path;
      const result = launchSelfReview(root, typeof clientPath === 'string' ? clientPath : '');
      sendJson(res, result.status, result.body);
    })
    .catch((err: Error) => {
      sendJson(res, 400, { ok: false, error: err.message });
    });
  return true;
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
 * client can update without a second fetch. Returns `true` once it owns the
 * response.
 */
const handleConfigWrite = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  root: string,
  pathname: string
): boolean => {
  const target = parseConfigTarget(pathname);
  if (!target) {
    sendJson(res, 400, { error: 'Invalid config path.' });
    return true;
  }

  readJsonBody(req)
    .then(body => {
      const content = (body as { content?: unknown }).content;
      if (typeof content !== 'string') {
        sendJson(res, 400, { error: 'Request body must include string "content".' });
        return;
      }
      return writeConfigFile(root, target.kind, target.id, content).then(result => {
        if (result.ok) {
          sendJson(res, 200, getConfig(root));
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
    .catch((err: Error) => {
      sendJson(res, 400, { error: err.message });
    });
  return true;
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

  // Resolve the request path under assetsDir and guard against traversal.
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

/**
 * Creates and starts the HTTP server, resolving with the bound URL once it is
 * listening. Rejects only on a genuine listen/bind error.
 */
export const startServer = (opts: ServeOptions): Promise<ServeHandle> => {
  const extraHandlers = opts.apiHandlers ?? [];
  const events = new EventsHub(opts.root, opts.debounceMs);

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    if (pathname.startsWith('/api/')) {
      for (const handler of extraHandlers) {
        if (handler(req, res, { root: opts.root, pathname })) return;
      }
      // The one sanctioned workspace mutation: archive a done plan.
      if (req.method === 'POST' && /^\/api\/plans\/[^/]+\/archive\/?$/.test(pathname)) {
        if (handleArchive(res, opts.root, pathname)) return;
      }
      // The one write-ish endpoint: launch the external self-review binary.
      if (req.method === 'POST' && /^\/api\/self-review\/?$/.test(pathname)) {
        if (handleSelfReview(req, res, opts.root)) return;
      }
      // The second sanctioned workspace mutation: overwrite a config file.
      if (req.method === 'PUT' && /^\/api\/config\/[^/]+\/[^/]+\/?$/.test(pathname)) {
        if (handleConfigWrite(req, res, opts.root, pathname)) return;
      }
      // Built-in SSE change stream.
      if (events.apiHandler(req, res, { pathname })) return;
      if (handleApi(res, opts.root, pathname)) return;
      sendJson(res, 404, { error: `Unknown API route: ${pathname}` });
      return;
    }

    handleStatic(res, opts.assetsDir, pathname);
  });

  // Tear the watcher and open client streams down with the server.
  server.on('close', () => events.close());

  return new Promise<ServeHandle>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, () => {
      server.removeListener('error', reject);
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : opts.port;
      const url = `http://localhost:${boundPort}`;
      events.start();
      if (opts.open) openBrowser(url);
      resolve({ url, server, port: boundPort, events });
    });
  });
};
