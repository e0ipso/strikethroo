/**
 * End-to-end verification for the Plan 92 live-update pipeline (SSE client +
 * "Live" affordance), implementing the plan's Self Validation as automated
 * integration coverage of its six Success Criteria.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against a
 * disposable COPY of this repo's `.ai/strikethroo/` workspace, so the suite can
 * freely mutate task statuses, add/remove plan directories, run write bursts,
 * and restart the `serve` process without touching the real workspace. The copy
 * is created per-suite and removed in teardown.
 *
 * Per the project test philosophy ("a few tests, mostly integration"), this is
 * the critical-path run covering the six end-to-end behaviors — live refresh,
 * plan add/remove, reconnect, burst coalescing, indicator states, and snapshot
 * pin/resume — not unit tests of EventSource or React internals.
 *
 * If the build output or a Chromium binary is unavailable the suite skips rather
 * than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Browser, Page } from 'playwright';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanSummary } from '../serve/workspace-model';

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

/** Tight debounce so a coalesced change lands well within the ~1s assertion. */
const DEBOUNCE_MS = 80;

/** Copies the live workspace into a disposable temp root; returns its path. */
const copyWorkspace = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-live-updates-'));
  fs.cpSync(LIVE_ROOT, root, { recursive: true });
  return root;
};

/** A dedicated fixture plan id, well clear of real workspace ids. */
const FIXTURE_ID = 960;
const FIXTURE_SLUG = 'live-fixture';

/**
 * Writes a controlled fixture plan with `count` pending tasks (single phase) into
 * the copied workspace, so live-refresh assertions own a deterministic starting
 * state instead of depending on the evolving real plans (one of which is the
 * plan executing this very suite).
 */
const writeFixturePlan = (root: string, count: number): PlanFiles => {
  const dir = path.join(root, 'plans', `${FIXTURE_ID}--${FIXTURE_SLUG}`);
  const tasksDir = path.join(dir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  const phaseTasks = Array.from({ length: count }, (_, i) => `0${i + 1}`).join(', ');
  fs.writeFileSync(
    path.join(dir, `plan-${FIXTURE_ID}--${FIXTURE_SLUG}.md`),
    `---\nid: ${FIXTURE_ID}\nsummary: "Live fixture"\ncreated: "2026-05-29"\n---\n\n` +
      `# ${FIXTURE_SLUG}\n\n## Execution Blueprint\n\n### Phase 1\n- Tasks ${phaseTasks}\n`
  );
  const taskFiles: string[] = [];
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(2, '0');
    const file = path.join(tasksDir, `${num}--task-${num}.md`);
    fs.writeFileSync(
      file,
      `---\nid: ${i}\ngroup: "fixture"\ndependencies: []\nstatus: "pending"\n` +
        `created: 2026-05-29\nskills:\n  - test\n---\n# Fixture task ${num}\n`
    );
    taskFiles.push(file);
  }
  return { id: FIXTURE_ID, dir, planFile: path.join(dir, `plan-${FIXTURE_ID}--${FIXTURE_SLUG}.md`), taskFiles };
};

/** Rewrites the `status:` frontmatter of a task file to `value`. */
const setTaskStatus = (taskFile: string, value: string): void => {
  const text = fs.readFileSync(taskFile, 'utf8');
  const next = text.replace(/^status:.*$/m, `status: "${value}"`);
  fs.writeFileSync(taskFile, next);
};

interface PlanFiles {
  id: number;
  dir: string;
  planFile: string;
  taskFiles: string[];
}

maybe('Live updates: SSE client + Live affordance (Playwright)', () => {
  let browser: Browser;
  let root: string;
  let handle: ServeHandle;
  let plan: PlanFiles;

  beforeAll(async () => {
    browser = await chromium!.launch();
    root = copyWorkspace();
    // A dedicated, deterministic fixture plan (all tasks pending) so live-edit
    // assertions do not depend on the evolving real plans.
    plan = writeFixturePlan(root, 3);
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: DEBOUNCE_MS,
    });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    if (handle) {
      const done = new Promise<void>(r => handle.server.close(() => r()));
      handle.server.closeAllConnections();
      await done;
    }
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  const newPage = async (): Promise<Page> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    return page;
  };

  /** Waits until the connection indicator reports the given data-state. */
  const waitForConnState = async (
    page: Page,
    state: 'connected' | 'reconnecting'
  ): Promise<void> => {
    await page.waitForFunction(
      s => {
        const el = document.querySelector('.conn-ind');
        return el?.getAttribute('data-state') === s;
      },
      state,
      { timeout: 15_000 }
    );
  };

  it('Criterion 1+2: a task status edit on disk updates the open Plan Detail within ~1s', async () => {
    const page = await newPage();
    try {
      // Open the Board (Tasks tab) so task cards by status are visible.
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
      await page.waitForSelector('.taskboard');
      // Indicator is live.
      await waitForConnState(page, 'connected');

      const doneCol = page.locator('.col').filter({ has: page.locator('.pill--done') });
      const before = await doneCol.locator('.tcard').count();

      // before/after screenshots around the live edit.
      await page.screenshot({ path: path.join(root, 'live-before.png') });

      // Force the first task to completed on disk; the Done column must grow
      // without any reload.
      setTaskStatus(plan.taskFiles[0]!, 'completed');

      await page.waitForFunction(
        prev => {
          const cols = Array.from(document.querySelectorAll('.col'));
          const done = cols.find(c => c.querySelector('.pill--done'));
          const count = done?.querySelectorAll('.tcard').length ?? 0;
          return count > prev;
        },
        before,
        { timeout: 3_000 }
      );
      await page.screenshot({ path: path.join(root, 'live-after.png') });

      expect(await doneCol.locator('.tcard').count()).toBeGreaterThan(before);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Criterion 2: creating then removing a plan directory updates the live Plans list', async () => {
    const page = await newPage();
    const throwawayId = 970;
    // Single-token slug so the humanized list title contains it verbatim
    // (humanizeSlug would split a kebab slug into separate words).
    const slug = 'zzliveprobe';
    const dir = path.join(root, 'plans', `${throwawayId}--${slug}`);
    // The Plans list shows the humanized title; assert against that rendered text.
    const rendered = 'Zzliveprobe';
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.sb');
      // The Plans list carries no connection indicator (it lives on the detail
      // views per the design); a short settle lets the shared EventSource open.
      await page.waitForTimeout(800);

      // The throwaway plan is not present initially.
      expect(await page.getByText(rendered).count()).toBe(0);

      // Create it on disk; it must appear live in the Plans list.
      fs.mkdirSync(path.join(dir, 'tasks'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, `plan-${throwawayId}--${slug}.md`),
        `---\nid: ${throwawayId}\nsummary: "Throwaway"\ncreated: "2026-05-29"\n---\n\n# ${slug}\n`
      );
      await page.waitForFunction(
        s => document.body.textContent?.includes(s) ?? false,
        rendered,
        { timeout: 5_000 }
      );

      // Remove it; it must disappear live.
      fs.rmSync(dir, { recursive: true, force: true });
      await page.waitForFunction(
        s => !(document.body.textContent?.includes(s) ?? false),
        rendered,
        { timeout: 5_000 }
      );
      expect(await page.getByText(rendered).count()).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      await page.close();
    }
  }, 45_000);

  it('Criterion 3: the stream reconnects after a server restart', async () => {
    // Self-contained server lifecycle on its own port so a restart cannot
    // poison the shared handle the other tests use. The EventSource reconnects
    // to the page's origin, so the restart must reuse the same port.
    let local = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: DEBOUNCE_MS,
    });
    const localPort = local.port;
    const page = await newPage();
    try {
      await page.goto(`${local.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await waitForConnState(page, 'connected');

      // Kill the serve process; the indicator must report reconnecting. The
      // browser holds the SSE connection open, so close the listener AND
      // force-terminate the live connection (Node's close() alone waits on it).
      const closed = new Promise<void>(r => local.server.close(() => r()));
      local.server.closeAllConnections();
      await closed;
      await waitForConnState(page, 'reconnecting');

      // Restart on the same port; the client's bounded backoff must recover.
      // Retry the bind briefly in case the port lingers in TIME_WAIT.
      for (let attempt = 0; ; attempt++) {
        try {
          local = await startServer({
            root,
            port: localPort,
            open: false,
            assetsDir: ASSETS_DIR,
            debounceMs: DEBOUNCE_MS,
          });
          break;
        } catch (err) {
          if (attempt >= 10) throw err;
          await new Promise<void>(r => setTimeout(r, 300));
        }
      }
      await waitForConnState(page, 'connected');
    } finally {
      await page.close();
      const done = new Promise<void>(r => local.server.close(() => r()));
      local.server.closeAllConnections();
      await done;
    }
  }, 60_000);

  it('Criterion 4: a burst of rapid writes coalesces into few revalidation passes', async () => {
    const page = await newPage();
    try {
      // Detail page: carries the connection indicator and mounts the plan
      // resource so a burst exercises the coalescing seam.
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await waitForConnState(page, 'connected');

      const start = await page.evaluate(
        () => (window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0
      );

      // Write to every task file many times in quick succession.
      const writes = 12;
      for (let i = 0; i < writes; i++) {
        for (const f of plan.taskFiles) {
          fs.writeFileSync(f, fs.readFileSync(f, 'utf8') + `\n<!-- burst ${i} -->`);
        }
      }

      // Wait for the coalesced pass(es) to settle.
      await page.waitForFunction(
        prev =>
          ((window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0) >
          prev,
        start,
        { timeout: 3_000 }
      );
      // Allow a generous settle window for any trailing passes.
      await page.waitForTimeout(800);

      const end = await page.evaluate(
        () => (window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0
      );
      const passes = end - start;
      // Far fewer passes than the writes*files individual change notifications —
      // server debounce + client coalescing collapse the burst. Allow a small
      // number for reconnect-replay timing, but it must not be one-per-write.
      expect(passes).toBeGreaterThanOrEqual(1);
      expect(passes).toBeLessThan(writes);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Criterion 5: the indicator renders in the Board snap bar and the detail header', async () => {
    const page = await newPage();
    try {
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await waitForConnState(page, 'connected');

      // Header indicator (present on every detail tab, including the Reader).
      expect(await page.locator('.chrome__actions .conn-ind').count()).toBe(1);

      // Board snap-bar indicator.
      await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
      await page.waitForSelector('.taskboard');
      expect(await page.locator('.snap .conn-ind').count()).toBe(1);

      // Both reflect connected (live treatment).
      const states = await page.locator('.conn-ind').evaluateAll(els =>
        els.map(e => e.getAttribute('data-state'))
      );
      expect(states.every(s => s === 'connected')).toBe(true);
      expect(await page.locator('.conn-ind--live').count()).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('Criterion 6: a pinned snapshot ignores changes; Live resumes following', async () => {
    const page = await newPage();
    try {
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
      await page.waitForSelector('.taskboard');
      await waitForConnState(page, 'connected');

      const todoCol = page.locator('.col').filter({ has: page.locator('.pill--todo') });
      const doneCol = page.locator('.col').filter({ has: page.locator('.pill--done') });

      // Scrub to the historical Start snapshot: every task forced to Todo.
      await page.locator('.snap__seg .snap__btn', { hasText: 'Start' }).click();
      const totalTasks = plan.taskFiles.length;
      await page.waitForFunction(
        n => {
          const cols = Array.from(document.querySelectorAll('.col'));
          const todo = cols.find(c => c.querySelector('.pill--todo'));
          return (todo?.querySelectorAll('.tcard').length ?? 0) === n;
        },
        totalTasks,
        { timeout: 3_000 }
      );
      const pinnedTodo = await todoCol.locator('.tcard').count();
      expect(pinnedTodo).toBe(totalTasks);

      // An incoming change must NOT move the pinned board: flip a task to done
      // on disk, give the stream time to deliver, and assert Todo is unchanged.
      setTaskStatus(plan.taskFiles[0]!, 'completed');
      await page.waitForTimeout(1_000);
      expect(await todoCol.locator('.tcard').count()).toBe(pinnedTodo);
      expect(await doneCol.locator('.tcard').count()).toBe(0);

      // Click "Live": the board returns to current state — the completed task
      // now appears in Done.
      await page.getByRole('button', { name: 'Live' }).click();
      await page.waitForFunction(
        () => {
          const cols = Array.from(document.querySelectorAll('.col'));
          const done = cols.find(c => c.querySelector('.pill--done'));
          return (done?.querySelectorAll('.tcard').length ?? 0) > 0;
        },
        undefined,
        { timeout: 3_000 }
      );
      expect(await doneCol.locator('.tcard').count()).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }, 45_000);
});
