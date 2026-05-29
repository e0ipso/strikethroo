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
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';

const LIVE_ROOT = path.resolve(process.cwd(), '.ai', 'strikethroo');
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
  return new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
};

const assetsBuilt = fs.existsSync(INDEX_HTML);

// Lazy import so environments without the browser binary skip gracefully.
let chromium: typeof import('playwright').chromium | null = null;
let browserAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  chromium = require('playwright').chromium;
  browserAvailable = true;
} catch {
  browserAvailable = false;
}

const maybe = assetsBuilt && browserAvailable ? describe : describe.skip;

maybe('app shell (Playwright)', () => {
  let browser: Browser;
  let full: ServeHandle;
  let staticOnly: { url: string; server: http.Server };

  beforeAll(async () => {
    browser = await chromium!.launch();
    full = await startServer({
      root: LIVE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    staticOnly = await startStaticOnly();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>((r) => full.server.close(() => r()));
    await new Promise<void>((r) => staticOnly.server.close(() => r()));
  });

  const newPage = async (): Promise<Page> => {
    const page = await browser.newPage();
    page.setDefaultTimeout(15_000);
    return page;
  };

  it('renders the persistent Sidebar + Chrome and highlights the active nav per route', async () => {
    const page = await newPage();
    try {
      // Plans (root).
      await page.goto(full.url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.sb');
      expect(await page.locator('.chrome__title').first().textContent()).toBe('Plans');
      expect(await page.locator('.sb__item--active').textContent()).toContain('Plans');
      // Footer carries the rebrand, never the stale name.
      expect(await page.locator('.sb__foot').textContent()).toContain('.ai/strikethroo/');

      // Navigate to Archive via the sidebar; active item + URL update. Scope
      // to the sidebar nav: the Plans List status bar also contains the word
      // "Archive" (the move-to-Archive guidance), so a bare getByText is
      // ambiguous.
      await page.locator('.sb__item').getByText('Archive', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/archive');
      expect(await page.locator('.chrome__title').first().textContent()).toBe('Archive');
      expect(await page.locator('.sb__item--active').textContent()).toContain('Archive');

      // Customize.
      await page.locator('.sb__item').getByText('Customize', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/customize');
      expect(await page.locator('.sb__item--active').textContent()).toContain('Customize');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('deep-links /plans/:id with a tab strip and survives back/forward + reload', async () => {
    const page = await newPage();
    try {
      await page.goto(`${full.url}/plans/38`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      expect(await page.locator('.chrome__tabs .tab').count()).toBeGreaterThan(0);
      // Plans nav highlights for planDetail.
      expect(await page.locator('.sb__item--active').textContent()).toContain('Plans');

      // A hard refresh restores the same deep-linked route (SPA fallback).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      expect(page.url()).toContain('/plans/38');

      // Back/forward through the History API.
      await page.locator('.sb__item').getByText('Customize', { exact: true }).click();
      await page.waitForFunction(() => location.pathname === '/customize');
      await page.goBack();
      await page.waitForFunction(() => location.pathname === '/plans/38');
      await page.waitForSelector('.chrome__tabs');
      await page.goForward();
      await page.waitForFunction(() => location.pathname === '/customize');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('transitions loading → data against the live API', async () => {
    const page = await newPage();
    try {
      await page.goto(full.url, { waitUntil: 'domcontentloaded' });
      // The Plans route resolves to the real List view (Plan 86): the table
      // header renders and the data state shows no error surface.
      await page.waitForSelector('.tbl--head');
      expect(await page.locator('.tbl--row').count()).toBeGreaterThan(0);
      expect(await page.locator('[role="alert"]').count()).toBe(0);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('shows a visible error surface when the API is unreachable (no crash, no blank)', async () => {
    const page = await newPage();
    try {
      await page.goto(staticOnly.url, { waitUntil: 'domcontentloaded' });
      // The shell still renders (sidebar present)...
      await page.waitForSelector('.sb');
      // ...and the data slot resolves to the designed error surface.
      await page.waitForSelector('[role="alert"]');
      expect(await page.locator('[role="alert"]').textContent()).toContain(
        'Could not reach the workspace API'
      );
    } finally {
      await page.close();
    }
  }, 30_000);

  it('renders every primitive in the gallery harness', async () => {
    const page = await newPage();
    try {
      await page.goto(`${full.url}/?gallery=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="gallery"]');
      // 5 StatusPill kinds, 3 Tickboxes, 4+1 Buttons, chips, icons.
      expect(await page.locator('.pill').count()).toBe(5);
      expect(await page.locator('.tickbox').count()).toBe(3);
      expect(await page.locator('.btn').count()).toBeGreaterThanOrEqual(5);
      expect(await page.locator('.chip').count()).toBeGreaterThanOrEqual(3);
      expect(await page.locator('.chip--branch').count()).toBe(1);
      // Open the modal and confirm the generic dialog (no command copy).
      await page.getByText('Open modal', { exact: true }).click();
      await page.waitForSelector('.modal');
      const modalText = await page.locator('.modal').textContent();
      expect(modalText).toContain('Modal title');
      expect(modalText).not.toContain('task-create-plan');
    } finally {
      await page.close();
    }
  }, 30_000);
});
