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
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanDetail, PlanSummary } from '../serve/workspace-model';

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

maybe('Plan Detail Reader (Playwright)', () => {
  let browser: Browser;
  let liveHandle: ServeHandle;
  let livePlan: PlanSummary;
  let liveDetail: PlanDetail;

  beforeAll(async () => {
    browser = await chromium!.launch();
    liveHandle = await startServer({
      root: LIVE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const plans = (await (await fetch(`${liveHandle.url}/api/plans`)).json()) as PlanSummary[];
    // First active plan with at least one task — a stable, real Reader target.
    livePlan = plans.find(p => !p.archived && p.total > 0) ?? plans[0]!;
    liveDetail = (await (
      await fetch(`${liveHandle.url}/api/plans/${livePlan.id}`)
    ).json()) as PlanDetail;
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>(r => liveHandle.server.close(() => r()));
  });

  const newPage = async (): Promise<Page> => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    return page;
  };

  it('renders a live plan: Plan tab active, prose + rail from the API', async () => {
    const page = await newPage();
    try {
      await page.goto(`${liveHandle.url}/plans/${livePlan.id}`, { waitUntil: 'networkidle' });

      // The .detail grid with both columns is present.
      await page.waitForSelector('.detail .reader');
      await page.waitForSelector('.detail .rail');

      // Plan tab is active in the Chrome tab bar.
      const activeTab = await page.locator('.chrome__tabs .tab--active').textContent();
      expect(activeTab).toContain('Plan');

      // Breadcrumb ends in plan.md; a Copy path action is present.
      const crumbs = (await page.locator('.chrome__crumb').textContent()) ?? '';
      expect(crumbs).toContain('plan.md');
      expect(await page.getByRole('button', { name: 'Copy path' }).count()).toBe(1);

      // The rail derives entirely from the API: one .rail__phase per derived
      // phase, and one .rail__task per task, both equal to the API payload.
      expect(await page.locator('.rail__phase').count()).toBe(liveDetail.phases.length);
      expect(await page.locator('.rail__task').count()).toBe(liveDetail.tasks.length);

      // Reader header binds to the live id (not hardcoded plan 38 content).
      const meta = (await page.locator('.reader__meta').textContent()) ?? '';
      expect(meta).toContain(String(liveDetail.id));
      expect(meta).toContain(`${liveDetail.tasks.length} tasks`);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('renders /plans/38 faithfully from the live API (rail + prose)', async () => {
    const page = await newPage();
    try {
      const detail = (await (await fetch(`${liveHandle.url}/api/plans/38`)).json()) as PlanDetail;

      await page.goto(`${liveHandle.url}/plans/38`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.detail .reader');

      // Rail matches plan 38's actual derived phases/tasks (live, not the
      // design's fictional 1-phase/3-task sample).
      expect(await page.locator('.rail__phase').count()).toBe(detail.phases.length);
      expect(await page.locator('.rail__task').count()).toBe(detail.tasks.length);

      // Success Criteria render as struck-capable checklist rows via Tickbox.
      const hasCriteria = detail.sections.some(s => /success\s+criteria/i.test(s.heading));
      if (hasCriteria) {
        expect(await page.locator('.crit .crit__row').count()).toBeGreaterThan(0);
      }
    } finally {
      await page.close();
    }
  }, 30_000);

  it('sanitizes plan content: injected script / handler does not execute', async () => {
    const root = makeFixtureWorkspace(701, 'hostile-fixture', HOSTILE_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const page = await newPage();
    try {
      await page.goto(`${handle.url}/plans/701`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.detail .reader');

      // The injected script never ran.
      const pwned = await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned);
      expect(pwned).toBeFalsy();

      // No <script> survived inside the reader, and no onerror handler attribute
      // remains on any rendered node.
      expect(await page.locator('.reader script').count()).toBe(0);
      const onerrorCount = await page.evaluate(
        () => document.querySelectorAll('.reader [onerror]').length
      );
      expect(onerrorCount).toBe(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it('shows an inline mermaid fence as source, not a rendered SVG', async () => {
    const root = makeFixtureWorkspace(702, 'mermaid-fixture', HOSTILE_BODY);
    const handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const page = await newPage();
    try {
      await page.goto(`${handle.url}/plans/702`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.reader__mermaid');

      // The fence is shown as source text...
      const src = (await page.locator('.reader__mermaid-src').textContent()) ?? '';
      expect(src).toContain('flowchart LR');
      // ...and is NOT rendered to an SVG inside the affordance.
      expect(await page.locator('.reader__mermaid svg').count()).toBe(0);
    } finally {
      await page.close();
      await new Promise<void>(r => handle.server.close(() => r()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it('does not eagerly bundle mermaid into the Reader bundle', () => {
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

  it('ships no legacy naming strings in the served bundle', () => {
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
