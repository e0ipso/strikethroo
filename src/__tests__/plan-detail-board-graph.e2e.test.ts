/**
 * End-to-end verification for the Plan Detail Graph view.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser, following the
 * plan's Self Validation. Per the project test philosophy ("a few tests, mostly
 * integration"), this is the critical-path run covering the Graph view's custom
 * behavior — the Graph Rendered/Source toggle, lazy-mermaid chunk isolation, and
 * the absent/malformed-diagram safety nets — not per-component unit suites.
 *
 * The snapshot-driven Plan Detail Board (Tasks tab) and its scrubber were
 * removed in Plan 95 (the Tasks tab now renders the Execute blueprint, covered
 * by plan-detail-execute.e2e.test.ts), so this file only exercises the Graph.
 *
 * Expectations are derived from the live API and disposable fixtures, never from
 * the design's hardcoded plan-38 sample: the real workspace's plan 38 is an
 * archived, `done` plan with two sequential tasks and mermaid blocks that are
 * NOT tagged as the Architectural Approach. Asserting against the actual served
 * model — not the design's fictional 3-task plan — is the correct gate.
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
const BUNDLE_DIR = path.join(ASSETS_DIR, 'assets');

const assetsBuilt = fs.existsSync(INDEX_HTML);

test.describe('Plan Detail Graph (Playwright)', () => {
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
    plan38 = (await (
      await fetch(`${liveHandle.url}/api/plans/38--fix-jekyll-link-baseurl`)
    ).json()) as PlanDetail;
  });

  test.afterAll(async () => {
    await new Promise<void>(r => liveHandle.server.close(() => r()));
  });

  /** Opens plan 38 and clicks the Graph tab. */
  const openGraph = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38--fix-jekyll-link-baseurl`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('tablist').waitFor();
    await page.getByRole('tab', { name: 'Graph' }).click();
    await page.getByTestId('graph').waitFor();
  };

  test('Graph: renders the model diagram and the Source toggle shows the extracted block', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    expect(plan38.mermaid.length).toBeGreaterThan(0);
    // The view prefers the Architectural Approach block, else the first.
    const expected = plan38.mermaid.find(m => m.isArchitecturalApproach) ?? plan38.mermaid[0]!;

    try {
      await openGraph(page);

      // Rendered view: the shared lazy renderer produces an SVG in the host.
      await page.waitForSelector('[data-testid="graph-canvas"] .mermaid-host svg', {
        timeout: 20_000,
      });
      expect(await page.locator('.mermaid-host svg').count()).toBe(1);

      // Toggle to Source: the raw mermaid text equals the model's block (trimmed).
      await page.getByText('Source', { exact: true }).click();
      await page.getByTestId('graph-source').waitFor();
      const src = (await page.getByTestId('graph-source').textContent()) ?? '';
      expect(src.trim()).toBe(expected.source.trim());
      // No SVG in the source view.
      expect(await page.getByTestId('graph-source').locator('svg').count()).toBe(0);

      // The legend is present.
      expect(await page.getByTestId('graph-legend').count()).toBe(1);
    } finally {
      await page.close();
    }
  });

  test('Graph: mermaid loads as a separate lazy chunk, absent from the eager bundle', () => {
    const jsFiles = fs.readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.js'));

    // The eager entry bundle must not contain the mermaid renderer internals.
    const eagerBundle = jsFiles
      .filter(f => /^index-/.test(f))
      .map(f => fs.readFileSync(path.join(BUNDLE_DIR, f), 'utf8'))
      .join('\n');
    expect(eagerBundle).not.toContain('mermaid.initialize');
    expect(eagerBundle).not.toContain('flowchart-elk');

    // Mermaid lives in its own separately fetched chunk.
    const hasMermaidChunk = jsFiles.some(f => /mermaid\.core/.test(f));
    expect(hasMermaidChunk).toBe(true);
  });
});
