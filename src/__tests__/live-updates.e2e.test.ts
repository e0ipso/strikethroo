/**
 * End-to-end verification for the Plan 92 live-update pipeline (the shared SSE
 * client), implementing the plan's Self Validation as automated integration
 * coverage of its Success Criteria.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against a
 * disposable COPY of this repo's `.ai/strikethroo/` workspace, so the suite can
 * freely mutate task statuses, add/remove plan directories, run write bursts,
 * and restart the `serve` process without touching the real workspace. The copy
 * is created per-suite and removed in teardown.
 *
 * Per the project test philosophy ("a few tests, mostly integration"), this is
 * the critical-path run covering the end-to-end behaviors — live refresh, plan
 * add/remove, reconnect, and burst coalescing — not unit tests of EventSource or
 * React internals. Connection health is observed behaviorally (a disk change
 * still propagates live) rather than via a visible badge: Plan 95 removed the
 * connection indicator, and Plan 95 also removed the snapshot pin/resume
 * behavior along with the Plan Detail Board, so neither is covered here.
 *
 * If the build output or a Chromium binary is unavailable the suite skips rather
 * than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, type Page } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/** Tight debounce so a coalesced change lands well within the ~1s assertion. */
const DEBOUNCE_MS = 80;

/** Copies the live workspace into a disposable temp root; returns its path. */
const copyWorkspace = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-live-updates-'));
  fs.cpSync(FIXTURE_ROOT, root, { recursive: true });
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
  // One `Task NN` bullet per task so the blueprint parser maps every task into
  // the single phase (the Tasks tab's Swimlanes/Outline views render tasks via
  // `phase.taskIds`; a `- Tasks 01, 02, 03` line would not match the parser).
  const phaseTasks = Array.from(
    { length: count },
    (_, i) => `- Task ${String(i + 1).padStart(2, '0')}`
  ).join('\n');
  fs.writeFileSync(
    path.join(dir, `plan-${FIXTURE_ID}--${FIXTURE_SLUG}.md`),
    `---\nid: ${FIXTURE_ID}\nsummary: "Live fixture"\ncreated: "2026-05-29"\n---\n\n` +
      `# ${FIXTURE_SLUG}\n\n## Execution Blueprint\n\n### Phase 1\n${phaseTasks}\n`
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
  return {
    id: FIXTURE_ID,
    dir,
    planFile: path.join(dir, `plan-${FIXTURE_ID}--${FIXTURE_SLUG}.md`),
    taskFiles,
  };
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

test.describe('Live updates: SSE client (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');
  // These tests share a single in-process server over one mutable workspace
  // fixture (the same task files are written across tests), so they must run in
  // order rather than racing each other's disk mutations.
  test.describe.configure({ mode: 'serial' });

  let root: string;
  let handle: ServeHandle;
  let plan: PlanFiles;

  test.beforeAll(async () => {
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
  });

  test.afterAll(async () => {
    if (handle) {
      const done = new Promise<void>(r => handle.server.close(() => r()));
      handle.server.closeAllConnections();
      await done;
    }
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * The connection state is no longer surfaced as a DOM badge (Plan 95 removed
   * the indicator), so a healthy stream is observed behaviorally. A short settle
   * lets the shared `EventSource` open before the test mutates the workspace;
   * the live propagation that follows is what actually proves the stream works.
   */
  const settleStream = async (page: Page): Promise<void> => {
    await page.waitForTimeout(800);
  };

  /** Reads the window-mirrored revalidation pass counter (see revalidation.tsx). */
  const revalidationCount = (page: Page): Promise<number> =>
    page.evaluate(
      () => (window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0
    );

  test('Criterion 1+2: a task status edit on disk updates the open Plan Detail within ~1s', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      // Open the Tasks tab (Execute blueprint, Swimlanes by default) so task
      // cards by status are visible.
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await page.locator('.chrome__tabs .tab', { hasText: 'Tasks' }).click();
      await page.waitForSelector('.exec');
      // Let the shared stream open before mutating the workspace.
      await settleStream(page);

      const doneTasks = page.locator('.lane-task--done');
      const before = await doneTasks.count();

      // before/after screenshots around the live edit.
      await page.screenshot({ path: path.join(root, 'live-before.png') });

      // Force the first task to completed on disk; the done task count must grow
      // without any reload.
      setTaskStatus(plan.taskFiles[0]!, 'completed');

      await page.waitForFunction(
        prev => document.querySelectorAll('.lane-task--done').length > prev,
        before,
        { timeout: 3_000 }
      );
      await page.screenshot({ path: path.join(root, 'live-after.png') });

      expect(await doneTasks.count()).toBeGreaterThan(before);
    } finally {
      await page.close();
    }
  });

  test('Criterion 2: creating then removing a plan directory updates the live Plans list', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
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
      // A short settle lets the shared EventSource open before we assert live
      // additions/removals.
      await page.waitForTimeout(800);

      // The throwaway plan is not present initially.
      expect(await page.getByText(rendered).count()).toBe(0);

      // Create it on disk; it must appear live in the Plans list.
      fs.mkdirSync(path.join(dir, 'tasks'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, `plan-${throwawayId}--${slug}.md`),
        `---\nid: ${throwawayId}\nsummary: "Throwaway"\ncreated: "2026-05-29"\n---\n\n# ${slug}\n`
      );
      await page.waitForFunction(s => document.body.textContent?.includes(s) ?? false, rendered, {
        timeout: 5_000,
      });

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
  });

  test('Criterion 3: the stream reconnects after a server restart', async ({ page }) => {
    page.setDefaultTimeout(15_000);
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
    try {
      await page.goto(`${local.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await settleStream(page);

      // Kill the serve process. The browser holds the SSE connection open, so
      // close the listener AND force-terminate the live connection (Node's
      // close() alone waits on it). The client drops to its reconnecting state.
      const closed = new Promise<void>(r => local.server.close(() => r()));
      local.server.closeAllConnections();
      await closed;

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

      // The indicator is gone, so prove recovery behaviorally: once the client's
      // backoff re-opens the stream against the restarted server, a fresh disk
      // change must still drive a live revalidation pass. SSE does not replay
      // events missed while disconnected, so probe repeatedly — the first write
      // that lands after the stream re-opens bumps the counter.
      const before = await revalidationCount(page);
      let recovered = false;
      for (let i = 0; i < 25 && !recovered; i++) {
        fs.writeFileSync(
          plan.taskFiles[1]!,
          fs.readFileSync(plan.taskFiles[1]!, 'utf8') + `\n<!-- reconnect probe ${i} -->`
        );
        try {
          await page.waitForFunction(
            prev =>
              ((window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ??
                0) > prev,
            before,
            { timeout: 1_000 }
          );
          recovered = true;
        } catch {
          // Stream not back yet; write again on the next iteration.
        }
      }
      expect(recovered).toBe(true);
    } finally {
      await page.close();
      const done = new Promise<void>(r => local.server.close(() => r()));
      local.server.closeAllConnections();
      await done;
    }
  });

  test('Criterion 4: a burst of rapid writes coalesces into few revalidation passes', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      // Detail page: mounts the plan resource so a burst exercises the
      // coalescing seam.
      await page.goto(`${handle.url}/plans/${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.chrome__tabs');
      await settleStream(page);

      const start = await revalidationCount(page);

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

      const end = await revalidationCount(page);
      const passes = end - start;
      // Far fewer passes than the writes*files individual change notifications —
      // server debounce + client coalescing collapse the burst. Allow a small
      // number for reconnect-replay timing, but it must not be one-per-write.
      expect(passes).toBeGreaterThanOrEqual(1);
      expect(passes).toBeLessThan(writes);
    } finally {
      await page.close();
    }
  });
});
