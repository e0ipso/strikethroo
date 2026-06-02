/**
 * Integration tests for the archive action — the serve app's single sanctioned
 * workspace mutation (plan 93).
 *
 * Per the project's "write a few tests, mostly integration" philosophy, these
 * drive the real `archivePlan` operation and the `POST /api/plans/:id/archive`
 * endpoint (over a real HTTP server on an ephemeral port) against a disposable,
 * per-test workspace fixture in the OS temp dir. The repository's own
 * `.ai/strikethroo/` is never touched.
 *
 * Coverage: the happy-path directory move, the precondition rejections
 * (not-done, unknown id, already-archived, destination-exists), the no-write
 * invariant (file contents are byte-identical before and after — only the
 * directory location changes), and a mutation-surface audit asserting the
 * archive endpoint is the ONLY HTTP route that mutates the workspace
 * filesystem.
 *
 * NOTE (plan 93 deviation): the plan's success criterion 6 stated the archive
 * endpoint would be the only non-`GET` route. A separately committed feature
 * (`POST /api/self-review`) adds a second non-`GET` route, so that literal
 * statement no longer holds. The honest, still-true invariant — and what the
 * audit asserts — is that archiving is the only route that WRITES to the
 * workspace: self-review spawns an external process but modifies nothing on
 * disk under the workspace.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import * as crypto from 'crypto';
import { startServer, ServeHandle } from '../serve/server';
import { archivePlan } from '../serve/archive';

interface HttpResponse {
  status: number;
  body: string;
}

/** Issues an HTTP request with an arbitrary method and optional JSON body. */
const httpRequest = (url: string, method: string, body?: string): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(body));
    }
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method,
        headers,
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });

const planMd = (id: number, title: string): string =>
  `---\nid: ${id}\nsummary: "${title}"\ncreated: 2026-05-28\n---\n# ${title}\n\nBody for ${title}.\n`;

const taskMd = (id: number, status: string): string =>
  `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "${status}"\nskills: [typescript]\n---\n# Task ${id}\n\nTask body.\n`;

/** Creates a plan directory under `plans/` with the given tasks. */
const makePlan = (
  root: string,
  slug: string,
  id: number,
  title: string,
  tasks: Array<{ name: string; status: string; id: number }>
): void => {
  const dir = path.join(root, 'plans', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `plan-${slug}.md`), planMd(id, title), 'utf8');
  const tasksDir = path.join(dir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  for (const t of tasks) {
    fs.writeFileSync(path.join(tasksDir, t.name), taskMd(t.id, t.status), 'utf8');
  }
};

/** A `done` plan (all tasks completed) and a non-done plan, in a fresh fixture. */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 1 }),
    'utf8'
  );
  makePlan(root, '12--example', 12, 'Example Done Plan', [
    { name: '01--first.md', id: 1, status: 'completed' },
    { name: '02--second.md', id: 2, status: 'completed' },
  ]);
  makePlan(root, '13--active', 13, 'Active Plan', [
    { name: '01--first.md', id: 1, status: 'pending' },
  ]);
  return root;
};

/** Recursively maps every file under `dir` to `relativePath -> sha256(content)`. */
const checksumTree = (dir: string): Map<string, string> => {
  const out = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
        out.set(path.relative(dir, abs), hash);
      }
    }
  };
  walk(dir);
  return out;
};

describe('archivePlan operation against fixtures', () => {
  let root: string;

  beforeEach(() => {
    root = buildFixture();
  });

  afterEach(() => {
    // root is `<tmp>/.ai/strikethroo`; remove the whole temp tree.
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  it('moves a done plan from plans/ to archive/ and returns the updated model', async () => {
    const result = await archivePlan(root, 12);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.plan.archived).toBe(true);
    expect(result.plan.state).toBe('done');
    expect(fs.existsSync(path.join(root, 'plans', '12--example'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'archive', '12--example', 'plan-12--example.md'))).toBe(
      true
    );
    expect(fs.existsSync(path.join(root, 'archive', '12--example', 'tasks', '01--first.md'))).toBe(
      true
    );
  });

  it('rejects a non-done plan with reason not-done and no filesystem change', async () => {
    const before = checksumTree(root);
    const result = await archivePlan(root, 13);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-done');
    expect(result.message).toMatch(/done/i);
    expect(checksumTree(root)).toEqual(before);
  });

  it('rejects an unknown plan id with reason not-found', async () => {
    const before = checksumTree(root);
    const result = await archivePlan(root, 999);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-found');
    expect(checksumTree(root)).toEqual(before);
  });

  it('rejects re-archiving an already-archived plan', async () => {
    const first = await archivePlan(root, 12);
    expect(first.ok).toBe(true);
    const second = await archivePlan(root, 12);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('already-archived');
  });

  it('refuses to overwrite an existing archive destination', async () => {
    fs.mkdirSync(path.join(root, 'archive', '12--example'), { recursive: true });
    const before = checksumTree(root);
    const result = await archivePlan(root, 12);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('destination-exists');
    // The source plan is untouched.
    expect(fs.existsSync(path.join(root, 'plans', '12--example', 'plan-12--example.md'))).toBe(
      true
    );
    expect(checksumTree(root)).toEqual(before);
  });

  it('preserves file contents byte-for-byte across the move (no-write invariant)', async () => {
    const planFiles = checksumTree(path.join(root, 'plans', '12--example'));
    const result = await archivePlan(root, 12);
    expect(result.ok).toBe(true);
    const archivedFiles = checksumTree(path.join(root, 'archive', '12--example'));
    expect(archivedFiles).toEqual(planFiles);
  });
});

describe('POST /api/plans/:id/archive endpoint against fixtures', () => {
  let root: string;
  let handle: ServeHandle;

  beforeEach(async () => {
    root = buildFixture();
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: os.tmpdir(),
      debounceMs: 150,
    });
  });

  afterEach(async () => {
    await new Promise<void>(resolve => handle.server.close(() => resolve()));
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  it('archives a done plan: 200 with the updated model and the directory moved', async () => {
    const res = await httpRequest(`${handle.url}/api/plans/12/archive`, 'POST');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(12);
    expect(body.archived).toBe(true);
    expect(fs.existsSync(path.join(root, 'plans', '12--example'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'archive', '12--example'))).toBe(true);
  });

  it('returns 409 for a non-done plan with an actionable message and no FS change', async () => {
    const before = checksumTree(root);
    const res = await httpRequest(`${handle.url}/api/plans/13/archive`, 'POST');
    expect(res.status).toBe(409);
    expect(typeof JSON.parse(res.body).error).toBe('string');
    expect(checksumTree(root)).toEqual(before);
  });

  it('returns 404 for an unknown plan id with no FS change', async () => {
    const before = checksumTree(root);
    const res = await httpRequest(`${handle.url}/api/plans/999/archive`, 'POST');
    expect(res.status).toBe(404);
    expect(typeof JSON.parse(res.body).error).toBe('string');
    expect(checksumTree(root)).toEqual(before);
  });

  it('returns 400 for a non-numeric plan id', async () => {
    const res = await httpRequest(`${handle.url}/api/plans/not-a-number/archive`, 'POST');
    expect(res.status).toBe(400);
  });

  it('mutation-surface audit: archive is the only route that writes the workspace', async () => {
    // Snapshot the workspace, then fire non-archive requests that, if any were a
    // hidden mutation, would change the tree. Read endpoints under several HTTP
    // methods, plus the self-review endpoint (which spawns a process but writes
    // nothing under the workspace), must all leave the filesystem untouched.
    const before = checksumTree(root);

    await httpRequest(`${handle.url}/api/plans`, 'POST');
    await httpRequest(`${handle.url}/api/plans`, 'DELETE');
    await httpRequest(`${handle.url}/api/config`, 'POST');
    await httpRequest(`${handle.url}/api/plans/12`, 'PUT');
    await httpRequest(`${handle.url}/api/plans/12`, 'DELETE');
    // A non-POST method on the archive path must NOT archive.
    await httpRequest(`${handle.url}/api/plans/12/archive`, 'DELETE');
    // self-review with an invalid path is rejected before any spawn.
    await httpRequest(`${handle.url}/api/self-review`, 'POST', JSON.stringify({ path: '' }));

    expect(checksumTree(root)).toEqual(before);
    expect(fs.existsSync(path.join(root, 'plans', '12--example'))).toBe(true);

    // The archive POST is the one request that does mutate the workspace.
    const res = await httpRequest(`${handle.url}/api/plans/12/archive`, 'POST');
    expect(res.status).toBe(200);
    expect(checksumTree(root)).not.toEqual(before);
  });
});
