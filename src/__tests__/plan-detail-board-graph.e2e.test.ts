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
import * as os from 'os';
import * as path from 'path';
import { test, expect, type Page } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail } from '../serve/workspace-model';

const LIVE_ROOT = path.resolve(process.cwd(), '.ai', 'strikethroo');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const BUNDLE_DIR = path.join(ASSETS_DIR, 'assets');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/** Builds a disposable workspace root with a single fixture plan; returns root. */
const makeFixtureWorkspace = (id: number, slug: string, body: string): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-board-graph-fixture-'));
  const planDir = path.join(root, 'plans', `${id}--${slug}`);
  fs.mkdirSync(path.join(planDir, 'tasks'), { recursive: true });
  fs.writeFileSync(
    path.join(planDir, `plan-${id}--${slug}.md`),
    `---\nid: ${id}\nsummary: "Fixture plan"\ncreated: "2026-05-29"\n---\n\n# ${slug}\n\n${body}`
  );
  return root;
};

/** A plan body with NO mermaid block — exercises the Graph empty state. */
const NO_DIAGRAM_BODY = `## Overview

A plan whose body embeds no mermaid diagram at all.

## Success Criteria

- Renders without a diagram
`;

/** A plan body whose mermaid fence is malformed — exercises the inline error. */
const MALFORMED_DIAGRAM_BODY = `## Architectural Approach

\`\`\`mermaid
this is not valid mermaid >>> @@@ %%% definitely not a flowchart
\`\`\`

## Success Criteria

- Renders an inline error, not a crash
`;

test.describe('Plan Detail Graph (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let liveHandle: ServeHandle;
  let plan38: PlanDetail;

  test.beforeAll(async () => {
    liveHandle = await startServer({
      root: LIVE_ROOT,
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

  /** Opens plan 38 and clicks the Graph tab. */
  const openGraph = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chrome__tabs');
    await page.locator('.chrome__tabs .tab', { hasText: 'Graph' }).click();
    await page.waitForSelector('.graph2');
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
      await page.waitForSelector('.graph2__canvas .mermaid-host svg', { timeout: 20_000 });
      expect(await page.locator('.mermaid-host svg').count()).toBe(1);

      // Toggle to Source: the raw mermaid text equals the model's block (trimmed).
      await page.locator('.graph2__toggle-btn', { hasText: 'Source' }).click();
      await page.waitForSelector('.graph2__source');
      const src = (await page.locator('.graph2__source').textContent()) ?? '';
      expect(src.trim()).toBe(expected.source.trim());
      // No SVG in the source view.
      expect(await page.locator('.graph2__source svg').count()).toBe(0);

      // The legend is present.
      expect(await page.locator('.graph2__legend').count()).toBe(1);
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

  test('Graph: a plan with no mermaid block shows the no-diagram empty state, not an error', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const root = makeFixtureWorkspace(881, 'no-diagram', NO_DIAGRAM_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    try {
      await page.goto(`${handle.url}/plans/881`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await page.locator('.chrome__tabs .tab', { hasText: 'Graph' }).click();
      await page.waitForSelector('.graph2');

      // Explicit no-diagram empty state, no error treatment, route intact.
      const canvasText = (await page.locator('.graph2__canvas').textContent()) ?? '';
      expect(canvasText.toLowerCase()).toContain('no diagram');
      expect(await page.locator('.mermaid-err').count()).toBe(0);
      // The toggle is absent when there is no diagram to toggle.
      expect(await page.locator('.graph2__toggle').count()).toBe(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('Graph: a malformed mermaid block surfaces an inline error without crashing the route', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const root = makeFixtureWorkspace(882, 'malformed-diagram', MALFORMED_DIAGRAM_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    try {
      await page.goto(`${handle.url}/plans/882`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await page.locator('.chrome__tabs .tab', { hasText: 'Graph' }).click();
      await page.waitForSelector('.graph2');

      // The inline .mermaid-err state appears; the route (Chrome + graph2) survives.
      await page.waitForSelector('.mermaid-err', { timeout: 20_000 });
      expect(await page.locator('.chrome__tabs').count()).toBe(1);
      expect(await page.locator('.graph2').count()).toBe(1);

      // Source toggle still works on a malformed diagram (shows the raw text).
      await page.locator('.graph2__toggle-btn', { hasText: 'Source' }).click();
      const src = (await page.locator('.graph2__source').textContent()) ?? '';
      expect(src).toContain('not valid mermaid');
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
