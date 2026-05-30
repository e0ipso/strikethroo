/**
 * Integration tests for the `serve` server's critical paths.
 *
 * Following the project's "write a few tests, mostly integration" philosophy,
 * these drive a real HTTP server bound to an ephemeral port against the live
 * `.ai/strikethroo/` workspace and a temp fixture. They cover the
 * application-specific behavior — the JSON API shape, the coalesced SSE
 * `changed` event under rapid writes, and the clear failure when no workspace
 * is found — rather than re-testing Node's http/fs primitives.
 *
 * NOTE on plan 38: the plan text references a 3/3 reference fixture
 * (`38--fix-category-3-harness-drift`) that does not exist in this workspace.
 * The real archived plan 38 here is `38--fix-jekyll-link-baseurl` (two
 * completed tasks, `state: done`). These tests assert plan 38's actual
 * observable shape, matching the workspace-model integration tests and the
 * deviation recorded in plan 83's execution summary.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { startServer, ServeHandle } from '../serve/server';
import { resolveWorkspaceRoot, isResolveError } from '../serve/root';

const LIVE_ROOT = path.resolve(process.cwd(), '.ai', 'strikethroo');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');

interface HttpResponse {
  status: number;
  body: string;
}

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

const httpPost = (url: string, body: string): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
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
      root: LIVE_ROOT,
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

  it('GET /api/plans/38 returns the task list and a non-empty mermaid string', async () => {
    const res = await httpGet(`${handle.url}/api/plans/38`);
    expect(res.status).toBe(200);
    const detail = JSON.parse(res.body);
    expect(Array.isArray(detail.tasks)).toBe(true);
    expect(detail.tasks.length).toBeGreaterThan(0);
    expect(detail.mermaid.length).toBeGreaterThan(0);
    expect(detail.mermaid[0].source.length).toBeGreaterThan(0);
  });

  it('GET /api/plans/:id with an unknown id returns 404 with a JSON error body', async () => {
    const res = await httpGet(`${handle.url}/api/plans/999999`);
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

  it('POST /api/self-review answers with a JSON ok-envelope', async () => {
    // Availability depends on the host; assert the wiring/contract, not the
    // verdict: a well-formed body always yields a numeric status and { ok }.
    const rel =
      '.ai/strikethroo/plans/38--fix-jekyll-link-baseurl/plan-38--fix-jekyll-link-baseurl.md';
    const res = await httpPost(`${handle.url}/api/self-review`, JSON.stringify({ path: rel }));
    expect([200, 400, 404, 409, 500]).toContain(res.status);
    const body = JSON.parse(res.body);
    expect(typeof body.ok).toBe('boolean');
    if (!body.ok) expect(typeof body.error).toBe('string');
  });

  it('POST /api/self-review rejects a malformed JSON body with 400', async () => {
    const res = await httpPost(`${handle.url}/api/self-review`, '{not json');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
  });
});

describe('serve server: SSE change stream coalescing', () => {
  let handle: ServeHandle;
  const scratchFile = path.join(LIVE_ROOT, 'plans', '.sse-integration-tmp.md');

  beforeAll(async () => {
    handle = await startServer({
      root: LIVE_ROOT,
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
