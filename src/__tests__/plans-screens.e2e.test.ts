/**
 * End-to-end validation for the Plan 86 Plans section.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against the live
 * `.ai/strikethroo/` workspace, following the plan's Self Validation. Per the
 * project test philosophy ("a few tests, mostly integration"), this is the
 * single critical-path run covering the section's custom behavior — view
 * switching, derived counters, the Board Show-done toggle, modal copy +
 * clipboard, plan navigation, and the naming-hygiene grep — rather than
 * per-view unit suites of trivial rendering.
 *
 * Expectations are derived from the live `/api/plans` response, not hardcoded:
 * the design assumed an active plan 38 (done 3/3), but the real workspace
 * evolved (plan 38 is archived). Asserting against the actual derived model is
 * the correct gate.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanSummary } from '../serve/workspace-model';

const LIVE_ROOT = path.resolve(process.cwd(), '.ai', 'strikethroo');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const BUNDLE_DIR = path.join(ASSETS_DIR, 'assets');

const assetsBuilt = fs.existsSync(INDEX_HTML);

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

/** Derived counters mirroring src/web/plans/derive.ts tabCounts. */
const deriveCounts = (plans: PlanSummary[]) => {
  const active = plans.filter(p => !p.archived);
  return {
    all: active.length,
    active: active.filter(p => p.state === 'doing' || p.state === 'ready').length,
    drafts: active.filter(p => p.state === 'drafted').length,
    first: active[0],
  };
};

maybe('Plans section (Playwright)', () => {
  let browser: Browser;
  let handle: ServeHandle;
  let counts: ReturnType<typeof deriveCounts>;

  beforeAll(async () => {
    browser = await chromium!.launch();
    handle = await startServer({
      root: LIVE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const res = await fetch(`${handle.url}/api/plans`);
    counts = deriveCounts((await res.json()) as PlanSummary[]);
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>(r => handle.server.close(() => r()));
  });

  const newPage = async (): Promise<Page> => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    return page;
  };

  it('switches Board / Cards / List in place and shows derived counters', async () => {
    const page = await newPage();
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });

      // Board view is the default. The Done column is hidden by default, so the
      // Board starts with three columns.
      await page.waitForSelector('.board .col');
      expect(await page.locator('.board .col').count()).toBe(3);

      // Counters equal the values derived from /api/plans (not hardcoded).
      expect(await page.locator('[data-testid="count-all"]').textContent()).toBe(`All ${counts.all}`);
      expect(await page.locator('[data-testid="count-active"]').textContent()).toBe(
        `Active ${counts.active}`
      );
      expect(await page.locator('[data-testid="count-drafts"]').textContent()).toBe(
        `Drafts ${counts.drafts}`
      );

      // Switch to Cards in place.
      await page.getByText('Cards', { exact: true }).click();
      await page.waitForSelector('.cards .card');
      expect(await page.locator('.cards .card').count()).toBe(counts.all);

      // Switch to List in place; one row per active plan.
      await page.getByText('List', { exact: true }).click();
      await page.waitForSelector('.tbl--head');
      expect(await page.locator('.tbl--row').count()).toBe(counts.all);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('toggles the Done column via the Board Show-done tickbox', async () => {
    const page = await newPage();
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });
      await page.getByText('Board', { exact: true }).click();
      await page.waitForSelector('.board .col');
      // Done is hidden by default, so the Board starts with three columns.
      expect(await page.locator('.board .col').count()).toBe(3);

      await page.getByText(/Show done/).click();
      await page.waitForFunction(() => document.querySelectorAll('.board .col').length === 4);
      expect(await page.locator('.board .col').count()).toBe(4);

      await page.getByText(/Hide done/).click();
      await page.waitForFunction(() => document.querySelectorAll('.board .col').length === 3);
      expect(await page.locator('.board .col').count()).toBe(3);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('opens the Create modal with current command copy and a matching clipboard write', async () => {
    const page = await newPage();
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });
      await page.getByText('Create plan', { exact: true }).click();
      await page.waitForSelector('.modal');

      const text = (await page.locator('.modal').textContent()) ?? '';
      expect(text).toContain('st-create-plan');
      expect(text).toContain('st-generate-tasks');
      expect(text).toContain('.ai/strikethroo/');
      expect(text).not.toContain('task-create-plan');
      expect(text).not.toContain('task-manager');

      await page.locator('.modal__cmd-copy').first().click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip).toBe('st-create-plan Add a Stripe customer-portal webhook with idempotent handling');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('navigates to /plans/:id when a plan row is clicked', async () => {
    const page = await newPage();
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });
      // Clickable rows live in the List view; the default Board has no rows.
      await page.getByText('List', { exact: true }).click();
      await page.waitForSelector('.tbl--row');
      // The List defaults to id-descending sort, so the first row's id is not
      // necessarily the API's first plan — read it off the row we click.
      const firstRow = page.locator('.tbl--row').first();
      const rowId = (await firstRow.locator('.tbl__id').textContent())?.trim();
      expect(rowId).toMatch(/^\d+$/);
      await firstRow.click();
      await page.waitForFunction(() => /^\/plans\/\d+$/.test(location.pathname));
      expect(page.url()).toContain(`/plans/${rowId}`);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('ships no legacy naming strings in the served bundle', () => {
    const bundle = fs
      .readdirSync(BUNDLE_DIR)
      .filter(f => f.endsWith('.js'))
      .map(f => fs.readFileSync(path.join(BUNDLE_DIR, f), 'utf8'))
      .join('\n');

    for (const legacy of [
      'task-manager',
      '/task-create-plan',
      'task-generate-tasks',
      'task-refine-plan',
      'plan archive',
    ]) {
      expect(bundle).not.toContain(legacy);
    }
    // The current names must be present.
    for (const current of ['st-create-plan', 'st-refine-plan', 'st-generate-tasks', 'self-review']) {
      expect(bundle).toContain(current);
    }
  });
});
