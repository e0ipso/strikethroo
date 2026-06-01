/**
 * End-to-end validation for the Plan 86 Plans section.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against a
 * disposable FIXTURE workspace seeded with one plan in each lifecycle state
 * (drafted / ready / doing / done) plus an archived plan, following the plan's
 * Self Validation. Per the project test philosophy ("a few tests, mostly
 * integration"), this is the single critical-path run covering the section's
 * custom behavior — view switching, derived counters, the Board and List
 * Show-done toggles, modal copy + clipboard, plan navigation, and the
 * naming-hygiene grep — rather than per-view unit suites of trivial rendering.
 *
 * The suite owns a controlled workspace rather than reading the live
 * `.ai/strikethroo/` tree: the live workspace evolves (Plan 95's own execution
 * drives its sole active plan to `done`, which the List hides by default),
 * which would leave these assertions with no visible active plan. A seeded
 * fixture keeps the derived counts and the List/Cards/Board contents
 * deterministic regardless of the real workspace's state. Expectations are
 * still derived from the served `/api/plans` model, never hardcoded.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanSummary } from '../serve/workspace-model';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const BUNDLE_DIR = path.join(ASSETS_DIR, 'assets');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/** Derived counters mirroring src/web/plans/derive.ts tabCounts. */
const deriveCounts = (plans: PlanSummary[]) => {
  const active = plans.filter(p => !p.archived);
  return {
    // All / Active / Drafts tab counters: derived from the active set, and the
    // `all` counter deliberately includes `done` plans that are not yet
    // archived.
    all: active.length,
    active: active.filter(p => p.state === 'doing' || p.state === 'ready').length,
    drafts: active.filter(p => p.state === 'drafted').length,
    // The List view hides `done` plans unless "Show done" is toggled on, so its
    // default row count is the active-but-not-done set, NOT `all`.
    activeNonDone: active.filter(p => p.state !== 'done').length,
    first: active[0],
  };
};

/**
 * One seed plan: `id`/`slug`, lifecycle `state`, and whether it lives under
 * `archive/`. Task files are written to produce the requested derived state
 * (drafted = no tasks, ready = a pending task, doing = a started task, done =
 * all tasks completed) per src/serve/derivation.ts.
 */
interface SeedPlan {
  id: number;
  slug: string;
  state: 'drafted' | 'ready' | 'doing' | 'done';
  archived?: boolean;
}

/** Task statuses that yield each derived plan state. */
const STATUSES_FOR_STATE: Record<SeedPlan['state'], string[]> = {
  drafted: [], // no tasks → drafted
  ready: ['pending'], // a task, none started → ready
  doing: ['in-progress', 'pending'], // ≥1 started, not all done → doing
  done: ['completed'], // all tasks completed → done
};

/**
 * Builds a disposable workspace root seeded with one plan per lifecycle state
 * plus an archived plan, so the derived counters and per-view contents are
 * deterministic and independent of the live `.ai/strikethroo/` tree. Returns
 * the absolute root path.
 */
const makeFixtureWorkspace = (seeds: SeedPlan[]): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-plans-screens-fixture-'));
  for (const seed of seeds) {
    const base = seed.archived ? 'archive' : 'plans';
    const planDir = path.join(root, base, `${seed.id}--${seed.slug}`);
    const tasksDir = path.join(planDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(planDir, `plan-${seed.id}--${seed.slug}.md`),
      `---\nid: ${seed.id}\nsummary: "Fixture ${seed.state} plan"\ncreated: "2026-05-29"\n---\n\n# ${seed.slug}\n`
    );
    const statuses = STATUSES_FOR_STATE[seed.state];
    statuses.forEach((status, i) => {
      const num = String(i + 1).padStart(2, '0');
      fs.writeFileSync(
        path.join(tasksDir, `${num}--task-${num}.md`),
        `---\nid: ${i + 1}\ngroup: "fixture"\ndependencies: []\nstatus: "${status}"\n` +
          `created: 2026-05-29\nskills:\n  - test\n---\n# Fixture task ${num}\n`
      );
    });
  }
  return root;
};

/**
 * The seed set: one active plan in each lifecycle state (so `all=4`,
 * `active=2`, `drafts=1`, `activeNonDone=3`) plus an archived plan that must be
 * excluded from every active counter and view.
 */
const SEED_PLANS: SeedPlan[] = [
  { id: 201, slug: 'fixture-drafted', state: 'drafted' },
  { id: 202, slug: 'fixture-ready', state: 'ready' },
  { id: 203, slug: 'fixture-doing', state: 'doing' },
  { id: 204, slug: 'fixture-done', state: 'done' },
  { id: 200, slug: 'fixture-archived', state: 'done', archived: true },
];

test.describe('Plans section (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let handle: ServeHandle;
  let root: string;
  let counts: ReturnType<typeof deriveCounts>;

  test.beforeAll(async () => {
    root = makeFixtureWorkspace(SEED_PLANS);
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
    const res = await fetch(`${handle.url}/api/plans`);
    counts = deriveCounts((await res.json()) as PlanSummary[]);
  });

  test.afterAll(async () => {
    await new Promise<void>(r => handle.server.close(() => r()));
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  test('switches Board / Cards / List in place and shows derived counters', async ({ page }) => {
    page.setDefaultTimeout(15_000);
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

      // Switch to List in place. The List hides `done` plans by default, so its
      // default row count is the active-but-not-done set, not every active plan.
      await page.getByText('List', { exact: true }).click();
      await page.waitForSelector('.tbl--head');
      expect(await page.locator('.tbl--row').count()).toBe(counts.activeNonDone);

      // Toggling "Show done" reveals the done plan too — now every active plan.
      await page.getByText('Show done', { exact: true }).click();
      await page.waitForFunction(n => document.querySelectorAll('.tbl--row').length === n, counts.all);
      expect(await page.locator('.tbl--row').count()).toBe(counts.all);
    } finally {
      await page.close();
    }
  });

  test('toggles the Done column via the Board Show-done tickbox', async ({ page }) => {
    page.setDefaultTimeout(15_000);
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
  });

  test('opens the Create modal with current command copy and a matching clipboard write', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
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
  });

  test('navigates to /plans/:id when a plan row is clicked', async ({ page }) => {
    page.setDefaultTimeout(15_000);
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
  });

  test('ships no legacy naming strings in the served bundle', () => {
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
