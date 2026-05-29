/**
 * End-to-end verification for the Plan 88 Plan Detail Board and Graph views.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser, following the
 * plan's Self Validation. Per the project test philosophy ("a few tests, mostly
 * integration"), this is the critical-path run covering the two views' custom
 * behavior — honest snapshot scrubbing, Done-column rendering from the live
 * model, the Graph Rendered/Source toggle, lazy-mermaid chunk isolation, and the
 * absent/malformed-diagram safety nets — not per-component unit suites.
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
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail } from '../serve/workspace-model';

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

/** Two-digit, zero-padded id, matching the Board card / deps formatting. */
const padId = (id: number): string => String(id).padStart(2, '0');

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

maybe('Plan Detail Board and Graph (Playwright)', () => {
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

  /** Opens plan 38 and clicks the Tasks tab to reach the Board. */
  const openBoard = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chrome__tabs');
    await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
    await page.waitForSelector('.taskboard');
  };

  /** Opens plan 38 and clicks the Graph tab. */
  const openGraph = async (page: Page): Promise<void> => {
    await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chrome__tabs');
    await page.locator('.chrome__tabs .tab', { hasText: 'Graph' }).click();
    await page.waitForSelector('.graph2');
  };

  it('Board: a real done plan shows all tasks in the Done column with correct card metadata', async () => {
    expect(plan38.state).toBe('done');
    const page = await newPage();
    try {
      await openBoard(page);

      // Default snapshot is `current`: every completed task lands in Done.
      const doneCol = page.locator('.col').filter({ has: page.locator('.pill--done') });
      const doneCards = doneCol.locator('.tcard');
      const expectedDone = plan38.tasks.filter(t => t.status === 'completed');
      expect(await doneCards.count()).toBe(expectedDone.length);
      // Column count badge matches.
      expect(await doneCol.locator('.col__count').textContent()).toBe(String(expectedDone.length));

      // Todo and Doing columns are empty for an all-completed plan.
      const todoCol = page.locator('.col').filter({ has: page.locator('.pill--todo') });
      expect(await todoCol.locator('.col__empty').count()).toBe(1);

      // Each Done card carries the live id, group, and deps (`none` when empty).
      for (const task of expectedDone) {
        if (task.id == null) continue;
        const card = doneCol.locator('.tcard', { hasText: `task · ${padId(task.id)}` });
        expect(await card.count()).toBe(1);
        const text = (await card.textContent()) ?? '';
        expect(text).toContain(task.name);
        if (task.group) expect(text).toContain(task.group);
        const deps = task.dependencies ?? [];
        const expectedDeps = deps.length === 0 ? 'none' : deps.map(padId).join(', ');
        expect(text).toContain(`deps · ${expectedDeps}`);
        // Phase tag present (P{n}) for a task that belongs to a phase.
        expect(await card.locator('.tcard__phase').count()).toBe(1);
      }
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Board: the snapshot scrubber honestly toggles start/current with no fabricated intermediate state', async () => {
    const page = await newPage();
    try {
      await openBoard(page);

      const segBtns = page.locator('.snap__seg .snap__btn');
      // Exactly two honest snapshots — no third fabricated `midPhase` entry.
      expect(await segBtns.count()).toBe(2);

      const todoCol = page.locator('.col').filter({ has: page.locator('.pill--todo') });
      const doneCol = page.locator('.col').filter({ has: page.locator('.pill--done') });
      const completed = plan38.tasks.filter(t => t.status === 'completed').length;

      // Current (default): completed tasks in Done, Todo empty.
      expect(await doneCol.locator('.tcard').count()).toBe(completed);

      // Switch to Start: every task forced to Todo, Done empties.
      await segBtns.nth(0).click();
      expect(await todoCol.locator('.tcard').count()).toBe(plan38.tasks.length);
      expect(await doneCol.locator('.tcard').count()).toBe(0);

      // Live returns to Current.
      await page.getByRole('button', { name: 'Live' }).click();
      expect(await doneCol.locator('.tcard').count()).toBe(completed);

      // The history-not-tracked notice is present.
      const boardText = (await page.locator('.snap, .col__hint').allTextContents()).join(' ');
      expect(boardText.toLowerCase()).toContain('not tracked');
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Graph: renders the model diagram and the Source toggle shows the extracted block', async () => {
    expect(plan38.mermaid.length).toBeGreaterThan(0);
    // The view prefers the Architectural Approach block, else the first.
    const expected = plan38.mermaid.find(m => m.isArchitecturalApproach) ?? plan38.mermaid[0]!;

    const page = await newPage();
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
  }, 45_000);

  it('Graph: mermaid loads as a separate lazy chunk, absent from the eager bundle', () => {
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

  it('Graph: a plan with no mermaid block shows the no-diagram empty state, not an error', async () => {
    const root = makeFixtureWorkspace(881, 'no-diagram', NO_DIAGRAM_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const page = await newPage();
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
  }, 45_000);

  it('Graph: a malformed mermaid block surfaces an inline error without crashing the route', async () => {
    const root = makeFixtureWorkspace(882, 'malformed-diagram', MALFORMED_DIAGRAM_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const page = await newPage();
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
  }, 45_000);
});
