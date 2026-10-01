/**
 * Integration tests for the `serve` server's critical paths.
 *
 * Following the project's "write a few tests, mostly integration" philosophy,
 * these drive a real HTTP server bound to an ephemeral port against a committed
 * fixture workspace (`src/__tests__/fixtures/serve-workspace/`). They cover the
 * application-specific behavior — the JSON API shape, the coalesced SSE
 * `changed` event under rapid writes, and the clear failure when no workspace
 * is found — rather than re-testing Node's http/fs primitives.
 *
 * The fixture holds real plan data copied from this project's own gitignored
 * `.ai/strikethroo/` so the suite runs identically on a clean CI checkout. The
 * archived plan 38 (`38--fix-jekyll-link-baseurl`) has two completed tasks and
 * `state: done`; these tests assert that observable shape, matching the
 * workspace-model integration tests.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as http from 'http';
import * as net from 'net';
import { AddressInfo } from 'net';
import { startServer, ServeHandle, CAPABILITY_HEADER } from '../serve/server';
import { resolveWorkspaceRoot, isResolveError } from '../serve/root';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');

interface HttpResponse {
  status: number;
  body: string;
}

interface FullResponse extends HttpResponse {
  headers: http.IncomingHttpHeaders;
}

/** The TCP address the server actually bound (never assume the family). */
const boundAddress = (handle: ServeHandle): AddressInfo => handle.server.address() as AddressInfo;

/**
 * Issues a request straight to the bound socket with full control over the
 * method, headers (including a forged `Host`), and body. Node only fills in
 * `Host` from the connection address when the caller does not supply one.
 */
const request = (
  handle: ServeHandle,
  opts: { method: string; path: string; headers?: Record<string, string>; body?: string | Buffer }
): Promise<FullResponse> =>
  new Promise((resolve, reject) => {
    const addr = boundAddress(handle);
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body !== undefined && headers['Content-Length'] === undefined) {
      headers['Content-Length'] = String(Buffer.byteLength(opts.body));
    }
    const req = http.request(
      { host: addr.address, port: addr.port, path: opts.path, method: opts.method, headers },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data })
        );
      }
    );
    req.on('error', reject);
    req.end(opts.body);
  });

/**
 * Writes a raw, possibly malformed HTTP request over a bare TCP socket and
 * returns everything the server sent back before closing the connection.
 */
const rawRequest = (handle: ServeHandle, payload: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const addr = boundAddress(handle);
    let data = '';
    const socket = net.connect(addr.port, addr.address, () => socket.write(payload));
    socket.setEncoding('utf8');
    socket.setTimeout(3000, () => socket.destroy());
    socket.on('data', chunk => (data += chunk));
    socket.on('close', () => resolve(data));
    socket.on('error', reject);
  });

const httpGet = (url: string): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      })
      .on('error', reject);
  });

const httpPost = (
  url: string,
  body: string,
  headers: Record<string, string> = {}
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', reject);
    req.end(body);
  });

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('serve server: read-only JSON API', () => {
  let handle: ServeHandle;

  beforeAll(async () => {
    handle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
  });

  it('GET /api/plans returns JSON including plan 38 as done', async () => {
    const res = await httpGet(`${handle.url}/api/plans`);
    expect(res.status).toBe(200);
    const plans = JSON.parse(res.body);
    const plan38 = plans.find((p: { id: number }) => p.id === 38);
    expect(plan38).toBeDefined();
    expect(plan38.state).toBe('done');
    // Real plan 38 (38--fix-jekyll-link-baseurl): two completed tasks.
    expect(plan38.done).toBe(plan38.total);
    expect(plan38.total).toBeGreaterThan(0);
  });

  it('GET /api/plans/:name (composite) returns the task list and a non-empty mermaid string', async () => {
    const res = await httpGet(`${handle.url}/api/plans/38--fix-jekyll-link-baseurl`);
    expect(res.status).toBe(200);
    const detail = JSON.parse(res.body);
    expect(detail.id).toBe(38);
    expect(detail.name).toBe('38--fix-jekyll-link-baseurl');
    expect(Array.isArray(detail.tasks)).toBe(true);
    expect(detail.tasks.length).toBeGreaterThan(0);
    expect(detail.mermaid.length).toBeGreaterThan(0);
    expect(detail.mermaid[0].source.length).toBeGreaterThan(0);
  });

  it('GET /api/plans/:id by bare numeric id no longer resolves (clean break)', async () => {
    const res = await httpGet(`${handle.url}/api/plans/38`);
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body);
    expect(typeof body.error).toBe('string');
  });

  it('GET /api/plans/:name with a grammar-valid but unknown name returns 404', async () => {
    const res = await httpGet(`${handle.url}/api/plans/999999--nope`);
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body);
    expect(typeof body.error).toBe('string');
  });

  it('GET /api/config returns hooks and templates', async () => {
    const res = await httpGet(`${handle.url}/api/config`);
    expect(res.status).toBe(200);
    const config = JSON.parse(res.body);
    expect(Array.isArray(config.hooks)).toBe(true);
    expect(Array.isArray(config.templates)).toBe(true);
    expect(config.hooks.length).toBeGreaterThan(0);
  });

  it('GET /api/capabilities reports self-review availability as a boolean', async () => {
    const res = await httpGet(`${handle.url}/api/capabilities`);
    expect(res.status).toBe(200);
    const caps = JSON.parse(res.body);
    expect(typeof caps.selfReview).toBe('boolean');
  });

  it('GET /api/capabilities reports the hosting project name and path', async () => {
    const res = await httpGet(`${handle.url}/api/capabilities`);
    expect(res.status).toBe(200);
    const caps = JSON.parse(res.body);
    // The fixture root is not nested under `.ai/strikethroo`, so the project
    // resolves to the root directory itself.
    expect(caps.project).toEqual({
      name: 'serve-workspace',
      path: FIXTURE_ROOT,
    });
  });

  it('POST /api/self-review answers with a JSON ok-envelope', async () => {
    // Availability depends on the host; assert the wiring/contract, not the
    // verdict: a well-formed body always yields a numeric status and { ok }.
    const rel = 'archive/38--fix-jekyll-link-baseurl/plan-38--fix-jekyll-link-baseurl.md';
    const res = await httpPost(`${handle.url}/api/self-review`, JSON.stringify({ path: rel }), {
      [CAPABILITY_HEADER]: handle.capability!,
    });
    expect([200, 400, 404, 409, 500]).toContain(res.status);
    const body = JSON.parse(res.body);
    expect(typeof body.ok).toBe('boolean');
    if (!body.ok) expect(typeof body.error).toBe('string');
  });

  it('POST /api/self-review rejects a malformed JSON body with 400', async () => {
    const res = await httpPost(`${handle.url}/api/self-review`, '{not json', {
      [CAPABILITY_HEADER]: handle.capability!,
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
  });
});

describe('serve server: loopback binding and request guard', () => {
  let handle: ServeHandle;

  beforeAll(async () => {
    handle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
  });

  it('binds a loopback address and advertises the address it actually bound', () => {
    const addr = boundAddress(handle);
    expect(['127.0.0.1', '::1']).toContain(addr.address);
    const literal = addr.address.includes(':') ? `[${addr.address}]` : addr.address;
    expect(handle.url).toBe(`http://${literal}:${addr.port}`);
    expect(handle.port).toBe(addr.port);
  });

  it('rejects a forged or missing Host on both static and API paths, case-insensitively', async () => {
    const port = boundAddress(handle).port;
    const forged = { Host: `evil.example:${port}` };

    const api = await request(handle, { method: 'GET', path: '/api/plans', headers: forged });
    expect(api.status).toBe(421);
    expect(JSON.parse(api.body)).toEqual({ error: 'Misdirected request.' });

    const page = await request(handle, { method: 'GET', path: '/', headers: forged });
    expect(page.status).toBe(421);
    expect(JSON.parse(page.body)).toEqual({ error: 'Misdirected request.' });

    // HTTP/1.0 may legitimately omit Host; the guard still refuses it.
    const noHost = await rawRequest(handle, 'GET /api/plans HTTP/1.0\r\n\r\n');
    expect(noHost).toMatch(/^HTTP\/1\.[01] 421/);

    // Matching ignores case for the allowed authorities.
    const upper = await request(handle, {
      method: 'GET',
      path: '/api/plans',
      headers: { Host: `LOCALHOST:${port}` },
    });
    expect(upper.status).toBe(200);
  });

  it('answers malformed targets with 400 and keeps serving from the same process', async () => {
    const port = boundAddress(handle).port;
    const malformed = [
      'GET /% HTTP/1.1',
      'GET /api/plans/%E0%A4%A HTTP/1.1',
      'GET /assets/%zz.js HTTP/1.1',
      'GET foo HTTP/1.1',
      'GET //evil.example/api/plans HTTP/1.1',
    ];
    for (const line of malformed) {
      const reply = await rawRequest(
        handle,
        `${line}\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`
      );
      expect(reply, line).toMatch(/^HTTP\/1\.1 400/);
    }
    // An absolute-form target naming a foreign authority is misdirected.
    const absolute = await rawRequest(
      handle,
      `GET http://evil.example:${port}/api/plans HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`
    );
    expect(absolute).toMatch(/^HTTP\/1\.1 421/);

    // The process survived every one of them.
    const ok = await httpGet(`${handle.url}/api/plans`);
    expect(ok.status).toBe(200);
    expect(Array.isArray(JSON.parse(ok.body))).toBe(true);
  });

  it('enforces per-route methods with 405 and an Allow header', async () => {
    const readDelete = await request(handle, { method: 'DELETE', path: '/api/plans' });
    expect(readDelete.status).toBe(405);
    expect(readDelete.headers.allow).toBe('GET, HEAD');

    const head = await request(handle, { method: 'HEAD', path: '/api/plans' });
    expect(head.status).toBe(200);
    expect(head.body).toBe('');

    const reviewGet = await request(handle, { method: 'GET', path: '/api/self-review' });
    expect(reviewGet.status).toBe(405);
    expect(reviewGet.headers.allow).toBe('POST');

    const configPost = await request(handle, {
      method: 'POST',
      path: '/api/config/hooks/PRE_PLAN',
    });
    expect(configPost.status).toBe(405);
    expect(configPost.headers.allow).toBe('PUT');

    // A mutation path with a read method never falls through to a read handler.
    const archiveGet = await request(handle, {
      method: 'GET',
      path: '/api/plans/38--fix-jekyll-link-baseurl/archive',
    });
    expect(archiveGet.status).toBe(405);
    expect(archiveGet.headers.allow).toBe('POST');

    const staticPost = await request(handle, { method: 'POST', path: '/' });
    expect(staticPost.status).toBe(405);
    expect(staticPost.headers.allow).toBe('GET, HEAD');
  });

  it('requires application/json on self-review, accepting a charset parameter', async () => {
    const authorized = { [CAPABILITY_HEADER]: handle.capability! };
    const review = await request(handle, {
      method: 'POST',
      path: '/api/self-review',
      headers: { 'Content-Type': 'text/plain', ...authorized },
      body: JSON.stringify({ path: 'archive/38--fix-jekyll-link-baseurl/plan.md' }),
    });
    expect(review.status).toBe(415);

    // A charset parameter and mixed case are still JSON.
    const charset = await request(handle, {
      method: 'POST',
      path: '/api/self-review',
      headers: { 'Content-Type': 'Application/JSON; charset=utf-8', ...authorized },
      body: JSON.stringify({ path: '' }),
    });
    expect(charset.status).not.toBe(415);
  });
});

// Mutation routes are exercised against a disposable workspace so that a
// regression can never rewrite the committed fixture.
describe('serve server: mutation media type and body rules', () => {
  let root: string;
  let handle: ServeHandle;
  let hookFile: string;

  const planMd = (id: number): string =>
    `---\nid: ${id}\nsummary: "Plan ${id}"\ncreated: 2026-05-28\n---\n# Plan ${id}\n`;
  const taskMd = (id: number): string =>
    `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "completed"\nskills: [typescript]\n---\n# Task ${id}\n`;

  beforeEach(async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-guard-test-'));
    root = path.join(tmpRoot, '.ai', 'strikethroo');
    const tasksDir = path.join(root, 'plans', '12--example', 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, '.init-metadata.json'),
      JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 })
    );
    fs.writeFileSync(path.join(root, 'plans', '12--example', 'plan-12--example.md'), planMd(12));
    fs.writeFileSync(path.join(tasksDir, '01--first.md'), taskMd(1));
    hookFile = path.join(root, 'config', 'hooks', 'PRE_PLAN.md');
    fs.mkdirSync(path.dirname(hookFile), { recursive: true });
    fs.writeFileSync(hookFile, '# PRE_PLAN\n\nOriginal hook body.\n');
    handle = await startServer({ root, port: 0, open: false, assetsDir: os.tmpdir() });
  });

  afterEach(async () => {
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  it('config write refuses text/plain with 415 and an oversized body with 413, file untouched', async () => {
    const before = fs.readFileSync(hookFile, 'utf8');
    const authorized = { [CAPABILITY_HEADER]: handle.capability! };

    const plain = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: { 'Content-Type': 'text/plain', ...authorized },
      body: JSON.stringify({ content: 'overwritten' }),
    });
    expect(plain.status).toBe(415);
    expect(fs.readFileSync(hookFile, 'utf8')).toBe(before);

    const oversized = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: { 'Content-Type': 'application/json', ...authorized },
      body: Buffer.alloc(1024 * 1024 + 1, 'a'),
    });
    expect(oversized.status).toBe(413);
    expect(fs.readFileSync(hookFile, 'utf8')).toBe(before);

    // The same route still writes when the request is well-formed.
    const ok = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...authorized },
      body: JSON.stringify({ content: 'rewritten' }),
    });
    expect(ok.status).toBe(200);
    expect(fs.readFileSync(hookFile, 'utf8')).toBe('rewritten');
  });

  it('refuses text/plain and an empty body, then archives on `{}` as application/json', async () => {
    const planDir = path.join(root, 'plans', '12--example');
    const authorized = { [CAPABILITY_HEADER]: handle.capability! };

    const plain = await request(handle, {
      method: 'POST',
      path: '/api/plans/12--example/archive',
      headers: { 'Content-Type': 'text/plain', ...authorized },
      body: '{}',
    });
    expect(plain.status).toBe(415);
    expect(fs.existsSync(planDir)).toBe(true);

    const empty = await request(handle, {
      method: 'POST',
      path: '/api/plans/12--example/archive',
      headers: { 'Content-Type': 'application/json', ...authorized },
    });
    expect(empty.status).toBe(400);
    expect(fs.existsSync(planDir)).toBe(true);

    const ok = await request(handle, {
      method: 'POST',
      path: '/api/plans/12--example/archive',
      headers: { 'Content-Type': 'application/json', ...authorized },
      body: '{}',
    });
    expect(ok.status).toBe(200);
    expect(fs.existsSync(planDir)).toBe(false);
    expect(fs.existsSync(path.join(root, 'archive', '12--example'))).toBe(true);
  });
});

// The per-start capability and the browser-origin policy on the three mutation
// routes. A disposable workspace again, with the self-review launcher stubbed
// so a rejected request is proven to launch nothing.
describe('serve server: mutation capability and origin policy', () => {
  let root: string;
  let handle: ServeHandle;
  let hookFile: string;
  let launches: Array<{ cmd: string; args: string[] }>;

  const planMd = (id: number): string =>
    `---\nid: ${id}\nsummary: "Plan ${id}"\ncreated: 2026-05-28\n---\n# Plan ${id}\n`;
  const taskMd = (id: number): string =>
    `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "completed"\nskills: [typescript]\n---\n# Task ${id}\n`;

  const start = (ws: string): Promise<ServeHandle> =>
    startServer({
      root: ws,
      port: 0,
      open: false,
      assetsDir: os.tmpdir(),
      selfReviewDeps: {
        available: () => true,
        spawnDetached: (cmd, args) => {
          launches.push({ cmd, args });
        },
      },
    });

  const authority = (): string => `127.0.0.1:${boundAddress(handle).port}`;

  /** Every way a browser-originated or forged mutation must be refused. */
  const rejections = (token: string): Array<{ name: string; headers: Record<string, string> }> => [
    { name: 'missing token', headers: {} },
    { name: 'wrong token', headers: { [CAPABILITY_HEADER]: `${token.slice(1)}x` } },
    { name: 'wrong length', headers: { [CAPABILITY_HEADER]: token.slice(0, -1) } },
    {
      name: 'foreign Origin',
      headers: { [CAPABILITY_HEADER]: token, Origin: 'http://evil.example' },
    },
    {
      name: 'null Origin',
      headers: { [CAPABILITY_HEADER]: token, Origin: 'null' },
    },
    {
      name: 'cross-site fetch metadata',
      headers: { [CAPABILITY_HEADER]: token, 'Sec-Fetch-Site': 'cross-site' },
    },
    {
      name: 'same-site fetch metadata',
      headers: { [CAPABILITY_HEADER]: token, 'Sec-Fetch-Site': 'same-site' },
    },
    {
      name: 'foreign Host',
      headers: { [CAPABILITY_HEADER]: token, Host: `evil.example:${boundAddress(handle).port}` },
    },
  ];

  beforeEach(async () => {
    launches = [];
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-capability-test-'));
    root = path.join(tmpRoot, '.ai', 'strikethroo');
    const tasksDir = path.join(root, 'plans', '12--example', 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, '.init-metadata.json'),
      JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 })
    );
    fs.writeFileSync(path.join(root, 'plans', '12--example', 'plan-12--example.md'), planMd(12));
    fs.writeFileSync(path.join(tasksDir, '01--first.md'), taskMd(1));
    hookFile = path.join(root, 'config', 'hooks', 'PRE_PLAN.md');
    fs.mkdirSync(path.dirname(hookFile), { recursive: true });
    fs.writeFileSync(hookFile, '# PRE_PLAN\n\nOriginal hook body.\n');
    handle = await start(root);
  });

  afterEach(async () => {
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  it('issues a fresh base64url capability per start and keeps it out of the read API', async () => {
    expect(handle.capability).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(handle.url).not.toContain(handle.capability);

    for (const route of [
      '/api/plans',
      '/api/config',
      '/api/capabilities',
      '/api/plans/12--example',
    ]) {
      const res = await request(handle, { method: 'GET', path: route });
      expect(res.status, route).toBe(200);
      expect(res.body, route).not.toContain(handle.capability);
    }

    const other = await start(root);
    try {
      expect(other.capability).not.toBe(handle.capability);
    } finally {
      await new Promise<void>(resolve => other.server.close(() => resolve()));
    }
  });

  it('GET /api/session hands the token only to a same-origin, authority-validated request', async () => {
    const ok = await request(handle, { method: 'GET', path: '/api/session' });
    expect(ok.status).toBe(200);
    expect(ok.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(ok.body)).toEqual({ token: handle.capability });

    const sameOrigin = await request(handle, {
      method: 'GET',
      path: '/api/session',
      headers: { Origin: `http://${authority()}`, 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(sameOrigin.status).toBe(200);

    const navigation = await request(handle, {
      method: 'GET',
      path: '/api/session',
      headers: { 'Sec-Fetch-Site': 'none' },
    });
    expect(navigation.status).toBe(200);

    const refused: Array<[string, Record<string, string>]> = [
      ['cross-site', { 'Sec-Fetch-Site': 'cross-site' }],
      ['same-site', { 'Sec-Fetch-Site': 'same-site' }],
      ['foreign Origin', { Origin: 'http://evil.example' }],
      ['https Origin on the right authority', { Origin: `https://${authority()}` }],
    ];
    for (const [name, headers] of refused) {
      const res = await request(handle, { method: 'GET', path: '/api/session', headers });
      expect(res.status, name).toBe(403);
      expect(res.body, name).not.toContain(handle.capability);
      expect(res.headers['access-control-allow-origin'], name).toBeUndefined();
    }

    const forgedHost = await request(handle, {
      method: 'GET',
      path: '/api/session',
      headers: { Host: `evil.example:${boundAddress(handle).port}` },
    });
    expect(forgedHost.status).toBe(421);
    expect(forgedHost.body).not.toContain(handle.capability);

    const post = await request(handle, { method: 'POST', path: '/api/session' });
    expect(post.status).toBe(405);
  });

  it('config write needs the capability and a same-origin request; a rejection leaves the file untouched', async () => {
    const before = fs.readFileSync(hookFile, 'utf8');
    const token = handle.capability!;

    for (const { name, headers } of rejections(token)) {
      const res = await request(handle, {
        method: 'PUT',
        path: '/api/config/hooks/PRE_PLAN',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ content: `overwritten by ${name}` }),
      });
      expect(res.status, name).toBe(name === 'foreign Host' ? 421 : 403);
      expect(fs.readFileSync(hookFile, 'utf8'), name).toBe(before);
      expect(res.headers['access-control-allow-origin'], name).toBeUndefined();
      expect(res.headers['access-control-allow-credentials'], name).toBeUndefined();
    }

    // Authorization is checked before the media type and before the body is
    // read: an unauthorized text/plain request is a 403, not a 415.
    const plainUnauthorized = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: { 'Content-Type': 'text/plain' },
      body: 'x',
    });
    expect(plainUnauthorized.status).toBe(403);

    // A token minted by another server instance is not this instance's.
    const other = await start(root);
    try {
      const foreign = await request(handle, {
        method: 'PUT',
        path: '/api/config/hooks/PRE_PLAN',
        headers: { 'Content-Type': 'application/json', [CAPABILITY_HEADER]: other.capability! },
        body: JSON.stringify({ content: 'overwritten by the other instance' }),
      });
      expect(foreign.status).toBe(403);
      expect(fs.readFileSync(hookFile, 'utf8')).toBe(before);
    } finally {
      await new Promise<void>(resolve => other.server.close(() => resolve()));
    }

    // The real client shape: token, JSON, no Origin header. And the browser
    // shape: token, JSON, a same-origin Origin.
    const ok = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: { 'Content-Type': 'application/json', [CAPABILITY_HEADER]: token },
      body: JSON.stringify({ content: 'rewritten' }),
    });
    expect(ok.status).toBe(200);
    expect(fs.readFileSync(hookFile, 'utf8')).toBe('rewritten');

    const browser = await request(handle, {
      method: 'PUT',
      path: '/api/config/hooks/PRE_PLAN',
      headers: {
        'Content-Type': 'application/json',
        [CAPABILITY_HEADER]: token,
        Origin: `http://${authority()}`,
        'Sec-Fetch-Site': 'same-origin',
      },
      body: JSON.stringify({ content: 'rewritten again' }),
    });
    expect(browser.status).toBe(200);
    expect(fs.readFileSync(hookFile, 'utf8')).toBe('rewritten again');
  });

  it('self-review never launches on a rejected request and launches once on a valid one', async () => {
    const token = handle.capability!;
    const body = JSON.stringify({ path: '.ai/strikethroo/plans/12--example/plan-12--example.md' });

    for (const { name, headers } of rejections(token)) {
      const res = await request(handle, {
        method: 'POST',
        path: '/api/self-review',
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      });
      expect(res.status, name).toBe(name === 'foreign Host' ? 421 : 403);
    }
    expect(launches).toEqual([]);

    const ok = await request(handle, {
      method: 'POST',
      path: '/api/self-review',
      headers: { 'Content-Type': 'application/json', [CAPABILITY_HEADER]: token },
      body,
    });
    expect(ok.status).toBe(200);
    expect(launches).toEqual([
      {
        cmd: 'self-review',
        args: [path.join(root, 'plans', '12--example', 'plan-12--example.md')],
      },
    ]);
  });
});

describe('serve server: SSE change stream coalescing', () => {
  let handle: ServeHandle;
  const scratchFile = path.join(FIXTURE_ROOT, 'plans', '.sse-integration-tmp.md');

  beforeAll(async () => {
    handle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
  });

  afterAll(async () => {
    if (fs.existsSync(scratchFile)) fs.unlinkSync(scratchFile);
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
  });

  it('coalesces a burst of rapid writes into exactly one changed event', async () => {
    let received = '';
    const req = http.get(`${handle.url}/api/events`, res => {
      res.on('data', chunk => (received += chunk.toString()));
    });

    // Let the SSE connection register before mutating the workspace.
    await delay(120);

    for (let i = 0; i < 6; i++) {
      fs.writeFileSync(scratchFile, `burst ${i} ${Date.now()}\n`);
      await delay(15);
    }

    // Wait comfortably past the debounce quiet window.
    await delay(500);

    const changedEvents = (received.match(/event: changed/g) ?? []).length;
    expect(changedEvents).toBe(1);

    req.destroy();
    // Allow disconnect cleanup to run; the client set should drain.
    await delay(100);
    expect(handle.events.clientCount).toBe(0);
  });
});

describe('serve server: workspace resolution failure', () => {
  it('resolveWorkspaceRoot reports a clear error outside an initialized workspace', () => {
    const result = resolveWorkspaceRoot({ cwd: path.parse(process.cwd()).root });
    expect(isResolveError(result)).toBe(true);
    if (isResolveError(result)) {
      expect(result.error).toMatch(/npx strikethroo init/);
    }
  });
});
