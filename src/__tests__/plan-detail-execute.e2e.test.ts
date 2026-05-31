/**
 * End-to-end verification for the Plan 89 Plan Detail Execute tab (Swimlanes /
 * Outline Execution-blueprint views).
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against the live
 * workspace, following the plan's Self Validation. Per the project test
 * philosophy ("a few tests, mostly integration"), this is the critical-path run
 * covering the feature's wiring and the two views' rendered output — the summary
 * tally, first-class phase containers, the parallel-vs-sequential grid, the
 * in-screen view toggle, and the optional Execution Summary callout — rather than
 * per-component unit suites (the pure derivation helpers are unit-tested
 * separately).
 *
 * Expectations are derived from the LIVE served model, never the design's
 * hardcoded plan-38 sample: the real workspace's plan 38 is an archived `done`
 * plan with two SEQUENTIAL phases of one completed task each and a parsed
 * Execution Summary section — so this run exercises both the stacked/sequential
 * path and the summary callout. Asserting against the actual served model is the
 * correct gate.
 *
 * If the build output or a Chromium binary is unavailable the suite skips rather
 * than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail } from '../serve/workspace-model';

const LIVE_ROOT = path.resolve(process.cwd(), '.ai', 'strikethroo');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

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

/** Maps a raw workspace status to the three presentational states. */
const toState = (status: string | undefined): 'todo' | 'doing' | 'done' => {
  if (status === 'completed') return 'done';
  if (status === 'pending' || status === undefined) return 'todo';
  return 'doing';
};

maybe('Plan Detail Execute tab (Playwright)', () => {
  let browser: Browser;
  let liveHandle: ServeHandle;
  let plan38: PlanDetail;

  beforeAll(async () => {
    browser = await chromium!.launch();
    liveHandle = await startServer({
      root: LIVE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    plan38 = (await (await fetch(`${liveHandle.url}/api/plans/38`)).json()) as PlanDetail;
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>(r => liveHandle.server.close(() => r()));
  });

  const newPage = async (): Promise<Page> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    return page;
  };

  /** Opens plan 38 and clicks the Tasks tab to reach the Execute blueprint. */
  const openExecute = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chrome__tabs');
    await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
    await page.waitForSelector('.snap__seg');
  };

  it('Swimlanes (default): summary tally, first-class phases, and the sequential grid', async () => {
    expect(plan38.state).toBe('done');
    const page = await newPage();
    try {
      await openExecute(page);

      // The toggle defaults to Swimlanes — the .exec subtree is shown, not .outline.
      await page.waitForSelector('.exec');
      expect(await page.locator('.outline').count()).toBe(0);

      const done = plan38.tasks.filter(t => toState(t.status) === 'done').length;
      const doing = plan38.tasks.filter(t => toState(t.status) === 'doing').length;
      const todo = plan38.tasks.filter(t => toState(t.status) === 'todo').length;

      // Summary header: "<phases> · <tasks>" and the live done/doing/todo tally.
      const sumTitle = (await page.locator('.exec__sum-title').textContent()) ?? '';
      expect(sumTitle).toContain(`${plan38.phases.length} phase`);
      expect(sumTitle).toContain(`${plan38.tasks.length} task`);
      const sumMeta = (await page.locator('.exec__sum-meta').textContent()) ?? '';
      expect(sumMeta).toContain(`${done} done`);
      expect(sumMeta).toContain(`${doing} doing`);
      expect(sumMeta).toContain(`${todo} todo`);

      // One first-class phase container per model phase.
      expect(await page.locator('.phase').count()).toBe(plan38.phases.length);

      // Plan 38's phases are sequential: each task grid uses a single column.
      const grids = page.locator('.phase__tasks');
      for (let i = 0; i < (await grids.count()); i++) {
        const cols = await grids.nth(i).evaluate(
          el => getComputedStyle(el as HTMLElement).gridTemplateColumns,
        );
        // A single-column grid resolves to one track (no space-separated tracks).
        expect(cols.trim().split(/\s+/).length).toBe(1);
      }

      // Every task card is rendered as done for this all-completed plan.
      expect(await page.locator('.lane-task').count()).toBe(plan38.tasks.length);
      expect(await page.locator('.lane-task--done').count()).toBe(done);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Outline: per-phase rows, done rows shown via strikethrough + StatusPill, and the Execution Summary callout', async () => {
    const page = await newPage();
    try {
      await openExecute(page);

      // Toggle to Outline (second segment) without leaving the Tasks tab.
      await page.locator('.snap__seg .snap__btn', { hasText: 'Outline' }).click();
      await page.waitForSelector('.outline');
      expect(await page.locator('.exec').count()).toBe(0);
      // Still on the Tasks tab (the chrome tab strip is unchanged).
      expect(await page.locator('.chrome__tabs').count()).toBe(1);

      const doneCount = plan38.tasks.filter(t => toState(t.status) === 'done').length;

      // One phase head + the right number of task rows.
      expect(await page.locator('.outline__phase-head').count()).toBe(plan38.phases.length);
      expect(await page.locator('.outline__row').count()).toBe(plan38.tasks.length);

      // Done tasks are surfaced via the strikethrough row modifier (the leading
      // Tickbox glyph was removed in Plan 95) — no tickboxes are rendered.
      expect(await page.locator('.outline__row--done').count()).toBe(doneCount);
      expect(await page.locator('.outline .tickbox').count()).toBe(0);

      // The Outline still renders a StatusPill per row; done rows carry a
      // `pill--done` pill inside a `.outline__row--done` row.
      expect(
        await page.locator('.outline__row--done .pill--done').count()
      ).toBe(doneCount);

      // Plan 38 has an Execution Summary section, so the callout is present.
      expect(await page.locator('.reader__summary').count()).toBe(1);
      const callout = (await page.locator('.reader__summary').textContent()) ?? '';
      expect(callout.toLowerCase()).toContain('execution summary');
    } finally {
      await page.close();
    }
  }, 45_000);
});
