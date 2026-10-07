/**
 * End-to-end verification that the Plan Detail self-review launch sends the
 * plan file path the API resolved, not one rebuilt from the plan directory name.
 *
 * Two disposable fixtures carry the shapes a reconstructed
 * `plans/<name>/plan-<name>.md` gets wrong. One is an archived plan, whose
 * directory lives under `archive/`. The other is an active plan whose markdown
 * filename does not follow the `plan-<name>.md` convention. Both are task-less,
 * so their derived state is `drafted` and the header's Review action renders.
 *
 * The launch is intercepted, so no `self-review` binary is required. The
 * assertion is the request itself, its path, route, and session capability. The
 * captured path then goes to the real `resolveReviewPath`, which the endpoint
 * delegates its containment check to, proving the server accepts what the
 * browser sent.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks browser-less environments.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import { resolveReviewPath } from '../serve/self-review';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const assetsBuilt = fs.existsSync(path.join(ASSETS_DIR, 'index.html'));

/** The two plan shapes a reconstructed `plans/<name>/plan-<name>.md` misses. */
const CASES = [
  {
    label: 'an archived plan',
    tree: 'archive',
    id: 7,
    name: '07--archived-plan',
    fileName: 'plan-07--archived-plan.md',
  },
  {
    label: 'a plan whose markdown filename is not plan-<name>.md',
    tree: 'plans',
    id: 8,
    name: '08--odd-filename',
    fileName: 'overview.md',
  },
] as const;

/**
 * A fresh workspace holding both fixture plans. Returns the absolute
 * `.ai/strikethroo` root, which is what `startServer` and `resolveReviewPath`
 * both take.
 */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'self-review-e2e-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(path.join(root, 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'archive'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
    'utf8'
  );
  for (const c of CASES) {
    const dir = path.join(root, c.tree, c.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, c.fileName),
      `---\nid: ${c.id}\nsummary: "Fixture plan"\ncreated: "2026-10-07"\n---\n\n` +
        `## Executive Summary\n\nA task-less plan, so its derived state is drafted.\n`,
      'utf8'
    );
  }
  return root;
};

test.describe('Self-review launch path (Playwright, fixture)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let handle: ServeHandle;
  let root: string;

  test.beforeEach(async () => {
    root = buildFixture();
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 100,
    });
  });

  test.afterEach(async () => {
    const done = new Promise<void>(r => handle.server.close(() => r()));
    handle.server.closeAllConnections();
    await done;
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  for (const c of CASES) {
    test(`launches ${c.label} with the resolved file path`, async ({ page }) => {
      page.setDefaultTimeout(15_000);

      // Report the binary as installed so the header action launches directly
      // instead of degrading to the fallback modal.
      await page.route(
        url => new URL(url).pathname === '/api/capabilities',
        route =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ selfReview: true }),
          })
      );
      // Intercepted so no binary is spawned; the request is the assertion.
      await page.route(
        url => new URL(url).pathname === '/api/self-review',
        route =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
          })
      );

      await page.goto(`${handle.url}/plans/${c.name}`, { waitUntil: 'domcontentloaded' });
      const review = page.getByRole('button', { name: 'Review in self-review' });
      await review.waitFor();

      const launched = page.waitForRequest(
        req => new URL(req.url()).pathname === '/api/self-review'
      );
      await review.click();
      const request = await launched;

      // The authority-checked API, with the session capability presented.
      expect(request.method()).toBe('POST');
      expect(request.headers()['content-type']).toContain('application/json');
      expect(request.headers()['x-strikethroo-capability']).toBe(handle.capability);

      const sent = (request.postDataJSON() as { path: string }).path;
      const actual = path.join(root, c.tree, c.name, c.fileName);
      const reconstructed = path.join('.ai', 'strikethroo', 'plans', c.name, `plan-${c.name}.md`);
      expect(sent).toBe(actual);
      expect(sent).not.toContain(reconstructed);

      // The containment check the endpoint delegates to accepts what was sent
      // and refuses the path the old reconstruction produced.
      expect(resolveReviewPath(root, sent)).toEqual({ absPath: actual });
      expect(resolveReviewPath(root, reconstructed)).toMatchObject({ status: 404 });
    });
  }
});
