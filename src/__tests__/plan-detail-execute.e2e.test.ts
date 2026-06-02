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
import { test, expect, type Page } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail } from '../serve/workspace-model';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/** Maps a raw workspace status to the three presentational states. */
const toState = (status: string | undefined): 'todo' | 'doing' | 'done' => {
  if (status === 'completed') return 'done';
  if (status === 'pending' || status === undefined) return 'todo';
  return 'doing';
};

test.describe('Plan Detail Execute tab (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let liveHandle: ServeHandle;
  let plan38: PlanDetail;

  test.beforeAll(async () => {
    liveHandle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    plan38 = (await (await fetch(`${liveHandle.url}/api/plans/38`)).json()) as PlanDetail;
  });

  test.afterAll(async () => {
    await new Promise<void>(r => liveHandle.server.close(() => r()));
  });

  /** Opens plan 38 and clicks the Tasks tab to reach the Execute blueprint. */
  const openExecute = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tablist').waitFor();
    await page.getByRole('tab', { name: 'Tasks' }).click();
    await page.getByTestId('exec-toggle').waitFor();
  };

  test('Swimlanes (default): summary tally, first-class phases, and the sequential grid', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    expect(plan38.state).toBe('done');
    try {
      await openExecute(page);

      // The toggle defaults to Swimlanes — the swimlanes subtree is shown, not outline.
      await page.getByTestId('swimlanes').waitFor();
      expect(await page.getByTestId('outline').count()).toBe(0);

      const done = plan38.tasks.filter(t => toState(t.status) === 'done').length;
      const doing = plan38.tasks.filter(t => toState(t.status) === 'doing').length;
      const todo = plan38.tasks.filter(t => toState(t.status) === 'todo').length;

      // Summary header: "<phases> · <tasks>" and the live done/doing/todo tally.
      const sumTitle = (await page.getByTestId('exec-sum-title').textContent()) ?? '';
      expect(sumTitle).toContain(`${plan38.phases.length} phase`);
      expect(sumTitle).toContain(`${plan38.tasks.length} task`);
      const sumMeta = (await page.getByTestId('exec-sum-meta').textContent()) ?? '';
      expect(sumMeta).toContain(`${done} done`);
      expect(sumMeta).toContain(`${doing} doing`);
      expect(sumMeta).toContain(`${todo} todo`);

      // One first-class phase container per model phase.
      expect(await page.getByTestId('phase').count()).toBe(plan38.phases.length);

      // Plan 38's phases are sequential: each task grid uses a single column.
      const grids = page.getByTestId('phase-tasks');
      for (let i = 0; i < (await grids.count()); i++) {
        const cols = await grids
          .nth(i)
          .evaluate(el => getComputedStyle(el as HTMLElement).gridTemplateColumns);
        // A single-column grid resolves to one track (no space-separated tracks).
        expect(cols.trim().split(/\s+/).length).toBe(1);
      }

      // Every task card is rendered as done for this all-completed plan.
      expect(await page.getByTestId('lane-task').count()).toBe(plan38.tasks.length);
      expect(await page.locator('[data-testid="lane-task"][data-state="done"]').count()).toBe(done);
    } finally {
      await page.close();
    }
  });

  test('Outline: per-phase rows, done rows shown via strikethrough + StatusPill, and the Execution Summary callout', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await openExecute(page);

      // Toggle to Outline (second segment) without leaving the Tasks tab.
      await page.getByText('Outline', { exact: true }).click();
      await page.getByTestId('outline').waitFor();
      expect(await page.getByTestId('swimlanes').count()).toBe(0);
      // Still on the Tasks tab (the chrome tab strip is unchanged).
      expect(await page.getByRole('tablist').count()).toBe(1);

      const doneCount = plan38.tasks.filter(t => toState(t.status) === 'done').length;

      // One phase head + the right number of task rows.
      expect(await page.getByTestId('outline-phase-head').count()).toBe(plan38.phases.length);
      expect(await page.getByTestId('outline-row').count()).toBe(plan38.tasks.length);

      // Done tasks are surfaced via the strikethrough done state (the leading
      // Tickbox glyph was removed in Plan 95) — no tickboxes are rendered.
      const doneRows = page.locator('[data-testid="outline-row"][data-state="done"]');
      expect(await doneRows.count()).toBe(doneCount);
      expect(await page.getByTestId('outline').getByTestId('tickbox').count()).toBe(0);

      // The Outline still renders a StatusPill per row; done rows carry a
      // done-kind pill reading "done".
      expect(await doneRows.locator('[data-testid="status-pill"][data-kind="done"]').count()).toBe(
        doneCount
      );

      // Plan 38 has an Execution Summary section, so the callout is present.
      expect(await page.getByTestId('exec-summary').count()).toBe(1);
      const callout = (await page.getByTestId('exec-summary').textContent()) ?? '';
      expect(callout.toLowerCase()).toContain('execution summary');
    } finally {
      await page.close();
    }
  });
});
