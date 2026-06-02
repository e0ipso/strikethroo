/**
 * End-to-end verification for the Plan 87 Plan Detail Reader view.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser, following the
 * plan's Self Validation. Per the project test philosophy ("a few tests, mostly
 * integration"), this is the single critical-path run covering the Reader's
 * custom behavior — live rendering, rail derivation, the sanitization boundary,
 * the non-rendered mermaid fence affordance, lazy-mermaid bundle isolation, and
 * naming hygiene — not per-component unit suites.
 *
 * Expectations are derived from the live API / disposable fixtures, never from
 * the design's hardcoded plan-38 sample: the design assumed an active plan 38
 * with fictional content, but the real workspace evolved (plan 38 is archived
 * and is a different plan). Asserting against the actual served model is the
 * correct gate, mirroring the Plan 86 Plans-screen e2e suite.
 *
 * Sanitization and mermaid-fence behavior are exercised against a disposable
 * temp workspace whose plan body deliberately contains a `<script>`, a raw
 * `<img onerror=…>`, and a ```mermaid fence — content no real plan should carry.
 *
 * If the build output or a Chromium binary is unavailable the suite skips rather
 * than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail, PlanSummary } from '../serve/workspace-model';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const BUNDLE_DIR = path.join(ASSETS_DIR, 'assets');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/** Markdown body that exercises the sanitization boundary and a mermaid fence. */
const HOSTILE_BODY = `## Overview

A plan body with hostile content that must be neutralized.

<script>window.__pwned = true;</script>

<img src="x" data-evil="1" onerror="window.__pwned = true;" />

\`\`\`mermaid
flowchart LR
  A[Start] --> B[End]
\`\`\`

## Success Criteria

- First criterion renders as a checklist row
- Second criterion renders as a checklist row
`;

/**
 * Markdown body with narrative sections, then the Notes + Execution Blueprint
 * tail. The Results tab starts at "Notes" (the first of the two), so Notes and
 * the blueprint both move off the Plan tab.
 */
const RESULTS_BODY = `## Executive Summary

The narrative half of the plan that stays on the Plan tab.

## Notes

A noteworthy event documented during execution.

## Execution Blueprint

The blueprint half that moves to the Results tab.

### Phase 1: Foundations

A phase under the blueprint heading.
`;

/** Builds a disposable workspace root with a single fixture plan, returns root. */
const makeFixtureWorkspace = (id: number, slug: string, body: string): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-reader-fixture-'));
  const planDir = path.join(root, 'plans', `${id}--${slug}`);
  fs.mkdirSync(path.join(planDir, 'tasks'), { recursive: true });
  fs.writeFileSync(
    path.join(planDir, `plan-${id}--${slug}.md`),
    `---\nid: ${id}\nsummary: "Fixture plan"\ncreated: "2026-05-29"\n---\n\n# ${slug}\n\n${body}`
  );
  return root;
};

test.describe('Plan Detail Reader (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let liveHandle: ServeHandle;
  let livePlan: PlanSummary;
  let liveDetail: PlanDetail;

  test.beforeAll(async () => {
    liveHandle = await startServer({
      root: FIXTURE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const plans = (await (await fetch(`${liveHandle.url}/api/plans`)).json()) as PlanSummary[];
    // First active plan with at least one task — a stable, real Reader target.
    livePlan = plans.find(p => !p.archived && p.total > 0) ?? plans[0]!;
    liveDetail = (await (
      await fetch(`${liveHandle.url}/api/plans/${livePlan.name}`)
    ).json()) as PlanDetail;
  });

  test.afterAll(async () => {
    await new Promise<void>(r => liveHandle.server.close(() => r()));
  });

  test('renders a live plan: Plan tab active, prose + rail from the API', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${liveHandle.url}/plans/${livePlan.name}`, {
        waitUntil: 'domcontentloaded',
      });

      // The two-column reader (prose + blueprint rail) is present.
      await page.getByTestId('reader').waitFor();
      await page.getByTestId('blueprint-rail').waitFor();

      // Plan tab is active in the Chrome tab bar.
      const activeTab = await page.getByRole('tab', { selected: true }).textContent();
      expect(activeTab).toContain('Plan');

      // Breadcrumb ends in plan.md; a Copy path action is present.
      const crumbs = (await page.getByTestId('breadcrumbs').textContent()) ?? '';
      expect(crumbs).toContain('plan.md');
      expect(await page.getByRole('button', { name: 'Copy path' }).count()).toBe(1);

      // The rail derives entirely from the API: one rail-phase per derived
      // phase, and one rail-task per task, both equal to the API payload.
      expect(await page.getByTestId('rail-phase').count()).toBe(liveDetail.phases.length);
      expect(await page.getByTestId('rail-task').count()).toBe(liveDetail.tasks.length);

      // Reader header binds to the live id (not hardcoded plan 38 content).
      const meta = (await page.getByTestId('reader-meta').textContent()) ?? '';
      expect(meta).toContain(String(liveDetail.id));
      expect(meta).toContain(`${liveDetail.tasks.length} tasks`);
    } finally {
      await page.close();
    }
  });

  test('renders /plans/38--fix-jekyll-link-baseurl faithfully from the live API (rail + prose)', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      const detail = (await (
        await fetch(`${liveHandle.url}/api/plans/38--fix-jekyll-link-baseurl`)
      ).json()) as PlanDetail;

      await page.goto(`${liveHandle.url}/plans/38--fix-jekyll-link-baseurl`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByTestId('reader').waitFor();

      // Rail matches plan 38's actual derived phases/tasks (live, not the
      // design's fictional 1-phase/3-task sample).
      expect(await page.getByTestId('rail-phase').count()).toBe(detail.phases.length);
      expect(await page.getByTestId('rail-task').count()).toBe(detail.tasks.length);

      // Success Criteria render as struck-capable checklist rows.
      const hasCriteria = detail.sections.some(s => /success\s+criteria/i.test(s.heading));
      if (hasCriteria) {
        expect(await page.getByTestId('crit-row').count()).toBeGreaterThan(0);
      }
    } finally {
      await page.close();
    }
  });

  test('sanitizes plan content: injected script / handler does not execute', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    const root = makeFixtureWorkspace(701, 'hostile-fixture', HOSTILE_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    try {
      await page.goto(`${handle.url}/plans/701--hostile-fixture`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByTestId('reader').waitFor();

      // The injected script never ran.
      const pwned = await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned);
      expect(pwned).toBeFalsy();

      // No <script> survived inside the reader, and no onerror handler attribute
      // remains on any rendered node.
      expect(await page.getByTestId('reader').locator('script').count()).toBe(0);
      const onerrorCount = await page.evaluate(
        () => document.querySelectorAll('[data-testid="reader"] [onerror]').length
      );
      expect(onerrorCount).toBe(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('renders an inline mermaid fence as a diagram while keeping its source available', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const root = makeFixtureWorkspace(702, 'mermaid-fixture', HOSTILE_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    try {
      await page.goto(`${handle.url}/plans/702--mermaid-fixture`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByTestId('reader-mermaid').waitFor();

      // The fence's raw source stays available in the affordance's <details>.
      const src = (await page.getByTestId('reader-mermaid-src').textContent()) ?? '';
      expect(src).toContain('flowchart LR');

      // The Plan reader renders the fence inline via the shared lazy mermaid
      // boundary (an actual SVG in the `.mermaid-host`), not as inert source.
      await page.waitForSelector('[data-testid="reader-mermaid"] .mermaid-host svg', {
        timeout: 15_000,
      });
      expect(await page.getByTestId('reader-mermaid').locator('svg').count()).toBeGreaterThan(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('moves the Notes + Execution Blueprint tail to the Results tab, off the Plan tab', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const root = makeFixtureWorkspace(703, 'results-fixture', RESULTS_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    try {
      await page.goto(`${handle.url}/plans/703--results-fixture`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByTestId('reader').waitFor();

      // Plan tab: shows the narrative section but NOT Notes / Execution Blueprint.
      const planProse = (await page.getByTestId('reader').textContent()) ?? '';
      expect(planProse).toContain('Executive Summary');
      expect(planProse).not.toContain('Execution Blueprint');
      expect(planProse).not.toContain('noteworthy event');
      expect(planProse).not.toContain('Phase 1: Foundations');

      // The Results tab is present; selecting it swaps the body to the tail.
      await page.getByRole('tab', { name: 'Results' }).click();
      await page.getByTestId('reader').waitFor();
      const resultsProse = (await page.getByTestId('reader').textContent()) ?? '';
      expect(resultsProse).toContain('Notes');
      expect(resultsProse).toContain('noteworthy event');
      expect(resultsProse).toContain('Execution Blueprint');
      expect(resultsProse).toContain('Phase 1: Foundations');
      // The Results tab is full-width prose with no blueprint rail.
      expect(await page.getByTestId('blueprint-rail').count()).toBe(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('does not eagerly bundle mermaid into the Reader bundle', () => {
    // The served JS bundle for the app (which includes the Reader route) must
    // not contain the mermaid renderer; mermaid lives behind a dynamic import().
    const jsFiles = fs.readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.js'));
    const eagerBundle = jsFiles
      .filter(f => /^index-/.test(f))
      .map(f => fs.readFileSync(path.join(BUNDLE_DIR, f), 'utf8'))
      .join('\n');

    // Mermaid's internals (e.g. the flowchart renderer) must be absent from the
    // eager entry bundle.
    expect(eagerBundle).not.toContain('mermaid.initialize');
    expect(eagerBundle).not.toContain('flowchart-elk');
  });

  test('ships no legacy naming strings in the served bundle', () => {
    const bundle = fs
      .readdirSync(BUNDLE_DIR)
      .filter(f => f.endsWith('.js'))
      .map(f => fs.readFileSync(path.join(BUNDLE_DIR, f), 'utf8'))
      .join('\n');

    for (const legacy of ['.ai/task-manager/', '/task-create-plan']) {
      expect(bundle).not.toContain(legacy);
    }
  });
});
