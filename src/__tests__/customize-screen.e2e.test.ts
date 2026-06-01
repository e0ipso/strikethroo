/**
 * End-to-end self-validation for the Plan 91 Customize screen (Task 005).
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against the live
 * `.ai/strikethroo/` workspace and its `/api/config` endpoint, executing the
 * plan's Self Validation procedure: the Hooks and Templates tabs are populated
 * ENTIRELY from `/api/config` (asserted against the live payload, never the
 * design's static arrays), the Chrome badges show the live counts, selecting a
 * hook/template reveals read-only markdown content with no functioning
 * Save/Edit/Revert control, and the rendered DOM uses `.ai/strikethroo/config/`
 * with no stale `task-manager` literal.
 *
 * Per the project test philosophy this covers the custom wiring worth covering
 * (live-data binding, derived counts, read-only enforcement, stale-name guard),
 * not the React/Playwright/serve framework internals. If the build output or a
 * Chromium binary is unavailable the suite skips rather than failing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const FIXTURE_ROOT = path.resolve(
  process.cwd(),
  'src',
  '__tests__',
  'fixtures',
  'serve-workspace'
);
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

const assetsBuilt = fs.existsSync(INDEX_HTML);

interface ConfigItem {
  id: string;
  file: string;
  content: string;
}

test.describe('Customize screen (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let handle: ServeHandle;
  let liveHooks: ConfigItem[];
  let liveTemplates: ConfigItem[];

  test.beforeAll(async () => {
    handle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const res = await fetch(`${handle.url}/api/config`);
    const cfg = (await res.json()) as { hooks: ConfigItem[]; templates: ConfigItem[] };
    liveHooks = cfg.hooks;
    liveTemplates = cfg.templates;
  });

  test.afterAll(async () => {
    await new Promise<void>(r => handle.server.close(() => r()));
  });

  test('captures a non-empty live config payload (id/file/content)', () => {
    expect(liveHooks.length).toBeGreaterThan(0);
    expect(liveTemplates.length).toBeGreaterThan(0);
    for (const item of [...liveHooks, ...liveTemplates]) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.file).toBe('string');
      expect(typeof item.content).toBe('string');
    }
  });

  test('renders the Hooks tab from live /api/config — counts and identifiers match', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cz__path-strip');

      // Title + live count badges (derived from the fetched collections).
      expect(await page.locator('.chrome__title').first().textContent()).toBe('Customize');
      const badges = await page.locator('.chrome__tabs .tab__count').allTextContents();
      expect(badges).toEqual([String(liveHooks.length), String(liveTemplates.length)]);

      // Path strip uses current strikethroo naming.
      expect(await page.locator('.cz__path-strip .chip').first().textContent()).toBe(
        '.ai/strikethroo/config/hooks/'
      );

      // Rendered hook identifiers equal the live API set (order-independent).
      const renderedIds = await page.locator('.cz__hook-id').allTextContents();
      expect(renderedIds.length).toBe(liveHooks.length);
      expect(new Set(renderedIds)).toEqual(new Set(liveHooks.map(h => h.id)));
    } finally {
      await page.close();
    }
  });

  test('renders the Templates tab from live /api/config — identifiers match', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cz__path-strip');

      await page.locator('.chrome__tabs .tab').nth(1).click();
      await page.waitForSelector('.cz__tpl');

      expect(await page.locator('.cz__path-strip .chip').first().textContent()).toBe(
        '.ai/strikethroo/config/templates/'
      );

      const renderedIds = await page.locator('.cz__tpl-id').allTextContents();
      expect(renderedIds.length).toBe(liveTemplates.length);
      expect(new Set(renderedIds)).toEqual(new Set(liveTemplates.map(t => t.id)));
    } finally {
      await page.close();
    }
  });

  test('reveals read-only hook and template content with no Save/Edit/Revert control', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cz__hook');

      // Reveal a hook's content; it renders through the sanitized markdown path.
      await page
        .locator('.cz__hook')
        .first()
        .getByText(/View content/)
        .click();
      await page.waitForSelector('.cz__hook .prose');
      expect(
        (await page.locator('.cz__hook .prose').first().textContent())?.length
      ).toBeGreaterThan(0);

      // Reveal a template's content.
      await page.locator('.chrome__tabs .tab').nth(1).click();
      await page.waitForSelector('.cz__tpl');
      await page
        .locator('.cz__tpl')
        .first()
        .getByText(/View content/)
        .click();
      await page.waitForSelector('.cz__tpl .prose');

      // No functioning editor controls anywhere in the section.
      const body = await page.locator('.main').innerText();
      expect(body).not.toMatch(/\bSave\b/);
      expect(body).not.toMatch(/Revert to default/);
      // No editable surfaces.
      expect(await page.locator('textarea').count()).toBe(0);
      expect(await page.locator('.cz__editor-body, .cz__line').count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test('uses .ai/strikethroo/config/ and never the stale task-manager literal', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cz__path-strip');
      const html = await page.content();
      expect(html).toContain('.ai/strikethroo/config/');
      expect(html).not.toContain('task-manager');
    } finally {
      await page.close();
    }
  });
});
