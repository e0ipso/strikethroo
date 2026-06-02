/**
 * End-to-end verification for the Plan 85 app shell.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser, following the
 * plan's Self Validation. Per the project test philosophy ("a few tests,
 * mostly integration"), this covers the custom logic worth covering — the
 * client router (path parsing, popstate back/forward, deep-link refresh) and
 * the data-layer state machine (loading/error/data, unreachable API → visible
 * error) — plus a primitive-gallery smoke render. It does NOT unit-assert
 * per-primitive class strings; the gallery render is the primitive check.
 *
 * Two server modes are exercised:
 *   - full server (startServer): SPA + live JSON API against the live
 *     `.ai/strikethroo/` workspace, for the routing and loading→data paths;
 *   - static-only server: serves dist-web with NO `/api/*` handler, so every
 *     API call 404s and the data layer must surface the visible error state.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/** A static file server with NO API: any `/api/*` request 404s. */
const startStaticOnly = (): Promise<{ url: string; server: http.Server }> => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no api' }));
      return;
    }
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
    const resolved = path.resolve(ASSETS_DIR, rel);
    let file = resolved;
    try {
      if (rel === '' || !fs.statSync(resolved).isFile()) file = INDEX_HTML;
    } catch {
      file = INDEX_HTML;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'text/html' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
};

const assetsBuilt = fs.existsSync(INDEX_HTML);

test.describe('app shell (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let full: ServeHandle;
  let staticOnly: { url: string; server: http.Server };

  test.beforeAll(async () => {
    full = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    staticOnly = await startStaticOnly();
  });

  test.afterAll(async () => {
    await new Promise<void>(r => full.server.close(() => r()));
    await new Promise<void>(r => staticOnly.server.close(() => r()));
  });

  test('renders the persistent Sidebar + Chrome and highlights the active nav per route', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      // Plans (root).
      await page.goto(full.url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('complementary').waitFor();
      expect(await page.getByRole('heading', { level: 1 }).first().textContent()).toBe('Plans');
      expect(await page.locator('[aria-current="page"]').textContent()).toContain('Plans');
      // Footer shows the hosting project's directory name (the folder that
      // contains the workspace), with the absolute path as its tooltip.
      await expect(page.getByTestId('project-name')).toHaveText('serve-workspace');
      expect(await page.getByTestId('project-name').getAttribute('title')).toBe(FIXTURE_ROOT);

      // Navigate to Archive via the sidebar; active item + URL update. Scope
      // to the sidebar nav: the Plans List status bar also contains the word
      // "Archive" (the move-to-Archive guidance), so a bare getByText is
      // ambiguous.
      await page.getByRole('navigation').getByText('Archive', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/archive');
      expect(await page.getByRole('heading', { level: 1 }).first().textContent()).toBe('Archive');
      expect(await page.locator('[aria-current="page"]').textContent()).toContain('Archive');

      // Customize.
      await page.getByRole('navigation').getByText('Customize', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/customize');
      expect(await page.locator('[aria-current="page"]').textContent()).toContain('Customize');
    } finally {
      await page.close();
    }
  });

  test('deep-links /plans/:id with a tab strip and survives back/forward + reload', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${full.url}/plans/38--fix-jekyll-link-baseurl`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByRole('tablist').waitFor();
      expect(await page.getByRole('tab').count()).toBeGreaterThan(0);
      // Plans nav highlights for planDetail.
      expect(await page.locator('[aria-current="page"]').textContent()).toContain('Plans');

      // A hard refresh restores the same deep-linked route (SPA fallback).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('tablist').waitFor();
      expect(page.url()).toContain('/plans/38--fix-jekyll-link-baseurl');

      // Back/forward through the History API.
      await page.getByRole('navigation').getByText('Customize', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/customize');
      await page.goBack();
      await page.waitForFunction(() => location.pathname === '/plans/38--fix-jekyll-link-baseurl');
      await page.getByRole('tablist').waitFor();
      await page.goForward();
      await page.waitForFunction(() => location.pathname === '/customize');
    } finally {
      await page.close();
    }
  });

  test('transitions loading → data against the live API', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(full.url, { waitUntil: 'domcontentloaded' });
      // The Plans route resolves to the real Board view (now the default, Plan
      // 95): the board columns render and the data state shows no error surface.
      await page.getByTestId('board-column').first().waitFor();
      expect(await page.getByTestId('board-column').count()).toBeGreaterThan(0);
      expect(await page.locator('[role="alert"]').count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test('shows a visible error surface when the API is unreachable (no crash, no blank)', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(staticOnly.url, { waitUntil: 'domcontentloaded' });
      // The shell still renders (sidebar present)...
      await page.getByRole('complementary').waitFor();
      // ...and the data slot resolves to the designed error surface.
      await page.waitForSelector('[role="alert"]');
      expect(await page.locator('[role="alert"]').textContent()).toContain(
        'Could not reach the workspace API'
      );
    } finally {
      await page.close();
    }
  });

  test('renders every primitive in the gallery harness', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${full.url}/?gallery=1`, { waitUntil: 'domcontentloaded' });
      const gallery = page.getByTestId('gallery');
      await gallery.waitFor();
      // 5 StatusPill kinds, 3 Tickboxes, 4+1 Buttons, chips, icons.
      expect(await gallery.getByTestId('status-pill').count()).toBe(5);
      expect(await gallery.getByTestId('tickbox').count()).toBe(3);
      expect(await gallery.getByTestId('button').count()).toBeGreaterThanOrEqual(5);
      expect(await gallery.getByTestId('chip').count()).toBeGreaterThanOrEqual(3);
      expect(await gallery.locator('[data-testid="chip"][data-variant="branch"]').count()).toBe(1);
      // Open the modal and confirm the generic dialog (no command copy).
      await page.getByText('Open modal', { exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const modalText = await dialog.textContent();
      expect(modalText).toContain('Modal title');
      expect(modalText).not.toContain('task-create-plan');
    } finally {
      await page.close();
    }
  });
});
