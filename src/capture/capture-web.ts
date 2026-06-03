/**
 * Documentation capture harness (`npm run capture:web`).
 *
 * A standalone, runnable Playwright script — deliberately NOT part of the
 * `npm test` gate — that drives the built `dist-web/` SPA in a real Chromium
 * against the committed capture fixture workspace
 * (`src/capture/fixtures/capture-workspace/`) and writes the full Capture
 * Inventory of still screenshots (PNG) and short interaction videos (webm) into
 * `docs/assets/`. The workspace is fixed for deterministic, repeatable output;
 * set `CAPTURE_WORKSPACE` to point at a different workspace root if needed.
 *
 * Design constraints (mirroring the `src/__tests__/*.e2e.test.ts` suites):
 *   - Guarded: if `dist-web/index.html` is missing OR Chromium is not
 *     installed, it logs a skip notice and exits 0 — never errors. This keeps
 *     browser-less / un-built environments green.
 *   - Reuses `startServer` from `src/serve/server` to host the workspace, and
 *     queries only the read-only JSON API (`/api/plans`, `/api/plans/:id`) to
 *     dynamically select a representative plan with tasks AND a dependency
 *     graph — no hard-coded plan IDs.
 *   - Readiness, not sleeps: every capture waits on a real rendered signal
 *     (content present, Graph mermaid `<svg>`, Customize CodeMirror mounted).
 *   - Light theme only, one representative desktop viewport.
 *
 * It does not use `page.evaluate(...)` (so it needs no browser globals): all
 * waits go through Playwright locators / `waitForSelector` / `waitForFunction`
 * driven from the Node side via serialized argument values only.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { startServer, type ServeHandle } from '../serve/server';
import type { PlanSummary, PlanDetail, Task } from '../serve/workspace-model';

/** Repo root: this file compiles to nothing, but at run time `__dirname` is
 *  `<repo>/src/capture` under ts-node, so the repo root is two levels up. */
const REPO_ROOT = path.resolve(__dirname, '..', '..');
/** Default to the committed fixture for deterministic captures; allow an
 *  absolute override via `CAPTURE_WORKSPACE`. */
const WORKSPACE_ROOT = process.env.CAPTURE_WORKSPACE
  ? path.resolve(process.env.CAPTURE_WORKSPACE)
  : path.join(__dirname, 'fixtures', 'capture-workspace');
const ASSETS_DIR = path.join(REPO_ROOT, 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'assets');

/** A single representative desktop viewport (light theme is the SPA default). */
const VIEWPORT = { width: 1440, height: 900 } as const;

const log = (msg: string): void => console.log(`[capture:web] ${msg}`);

/** The plans chosen from the live API for the detail captures. `detail` drives
 *  every Plan Detail capture; `graphDetail` is the simpler, distinct plan used
 *  ONLY for the Graph capture; `task` is the deep-linkable Task Detail target. */
type Picked = { detail: PlanDetail; task: Task; graphDetail: PlanDetail };

/**
 * Deliberate video-pacing pause. This is ONLY for human-viewing of the recorded
 * interaction videos — it lets a viewer register each visual state before the
 * next action fires. It is NOT a readiness wait and must never replace the
 * `waitForSelector` / `waitForFunction` calls that gate on real rendered
 * signals; the beats are purely additive cosmetic holds between meaningful
 * steps.
 */
const beat = async (page: Page, ms = 900): Promise<void> => {
  await page.waitForTimeout(ms);
};

/**
 * Plain-JS (string) init script injected into every video page. Playwright
 * records no real mouse cursor, so clicks would otherwise be invisible. This
 * draws a fixed-position dot that follows `mousemove` and pulses on `mousedown`
 * so the pointer path and clicks are followable in the webm. Authored as a
 * string of browser JS (not a TS function) to avoid pulling browser globals
 * into the TS/eslint surface — mirroring how this file avoids `page.evaluate`.
 */
const CURSOR_INIT_SCRIPT = `(() => {
  const install = () => {
    if (document.getElementById('__capture_cursor__')) return;
    const dot = document.createElement('div');
    dot.id = '__capture_cursor__';
    dot.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:22px',
      'height:22px',
      'margin:-11px 0 0 -11px',
      'border-radius:50%',
      'background:rgba(255,64,96,0.45)',
      'border:2px solid rgba(255,64,96,0.95)',
      'box-shadow:0 0 8px rgba(255,64,96,0.6)',
      'pointer-events:none',
      'z-index:2147483647',
      'transition:transform 80ms ease-out',
      'transform:translate(0,0) scale(1)',
    ].join(';');
    document.body.appendChild(dot);
    let x = 0;
    let y = 0;
    document.addEventListener('mousemove', e => {
      x = e.clientX;
      y = e.clientY;
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
    }, true);
    document.addEventListener('mousedown', () => {
      dot.style.transform = 'translate(0,0) scale(0.55)';
    }, true);
    document.addEventListener('mouseup', () => {
      dot.style.transform = 'translate(0,0) scale(1)';
    }, true);
  };
  if (document.body) install();
  else document.addEventListener('DOMContentLoaded', install);
})();`;

/** Skip-and-exit-0 helper: this is a documentation tool, not a test gate. */
const skip = (reason: string): never => {
  log(`Skipping capture: ${reason}`);
  process.exit(0);
};

/** Two-digit zero-padded task id — mirrors the swimlane `lane-task__id` text. */
const pad2 = (n: number | undefined): string => String(n ?? 0).padStart(2, '0');

/** Maps a raw task status to the three presentational states (mirrors the UI). */
const toState = (status: string | undefined): 'todo' | 'doing' | 'done' => {
  if (status === 'completed') return 'done';
  if (status === 'pending' || status === undefined) return 'todo';
  return 'doing';
};

/**
 * Picks a representative plan for the Plan Detail / Graph / Tasks / Task Detail
 * captures by inspecting the live API: it prefers a plan whose detail payload
 * has a non-empty task list, more than one phase or a task with declared
 * dependencies (so the Graph renders a real DAG), at least one done task (for
 * the strikethrough capture), and a mermaid block. Falls back progressively so
 * the harness still produces output on a sparse workspace.
 */
const selectPlan = async (baseUrl: string, summaries: PlanSummary[]): Promise<Picked | null> => {
  // Only ACTIVE plans are reachable through the Plans board / Plan Detail
  // routes the detail captures drive, so archived plans are out of scope here.
  const details: PlanDetail[] = [];
  for (const s of summaries.filter(s => !s.archived)) {
    const res = await fetch(`${baseUrl}/api/plans/${encodeURIComponent(s.name)}`);
    if (!res.ok) continue;
    details.push((await res.json()) as PlanDetail);
  }

  const hasGraph = (p: PlanDetail): boolean =>
    p.phases.length > 1 || p.tasks.some(t => t.dependencies.length > 0);
  const hasDone = (p: PlanDetail): boolean => p.tasks.some(t => toState(t.status) === 'done');
  const hasMermaid = (p: PlanDetail): boolean => p.mermaid.length > 0;

  const score = (p: PlanDetail): number =>
    (p.tasks.length > 0 ? 1 : 0) +
    (hasGraph(p) ? 4 : 0) +
    (hasMermaid(p) ? 2 : 0) +
    (hasDone(p) ? 1 : 0);

  const ranked = details
    .filter(p => p.tasks.length > 0)
    .sort((a, b) => score(b) - score(a) || b.tasks.length - a.tasks.length);

  const chosen = ranked[0];
  if (!chosen) return null;

  // Prefer a done task for Task Detail (so the linked detail has rich content),
  // else the first task. A task without an id cannot be deep-linked.
  const task =
    chosen.tasks.find(t => toState(t.status) === 'done' && t.id != null) ??
    chosen.tasks.find(t => t.id != null) ??
    chosen.tasks[0];
  if (!task) return null;

  // The Graph capture wants a DIFFERENT, visually simpler plan: among plans
  // that render a graph and are not the primary, pick the one with the FEWEST
  // tasks (a cleaner DAG). Fall back to the primary if none qualifies.
  const graphDetail =
    details
      .filter(p => p.id !== chosen.id && hasGraph(p))
      .sort((a, b) => a.tasks.length - b.tasks.length)[0] ?? chosen;

  return { detail: chosen, task, graphDetail };
};

/** Selects an archived plan id for Archive captures, if any exist. */
const hasArchived = (summaries: PlanSummary[]): boolean => summaries.some(p => p.archived);

/** Selects a config (hooks) file id to open in the Customize editor. */
const selectConfigId = async (baseUrl: string): Promise<{ kind: string; id: string } | null> => {
  const res = await fetch(`${baseUrl}/api/config`);
  if (!res.ok) return null;
  const cfg = (await res.json()) as {
    hooks: Array<{ id: string }>;
    templates: Array<{ id: string }>;
  };
  if (cfg.hooks.length > 0 && cfg.hooks[0]) return { kind: 'hooks', id: cfg.hooks[0].id };
  if (cfg.templates.length > 0 && cfg.templates[0])
    return { kind: 'templates', id: cfg.templates[0].id };
  return null;
};

/** Reads a config file's current content via the read-only API, or null. */
const readConfigContent = async (
  baseUrl: string,
  kind: string,
  id: string
): Promise<string | null> => {
  const res = await fetch(`${baseUrl}/api/config`);
  if (!res.ok) return null;
  const cfg = (await res.json()) as Record<string, Array<{ id: string; content: string }>>;
  const file = (cfg[kind] ?? []).find(f => f.id === id);
  return file ? file.content : null;
};

/** Saves a full-page PNG to `docs/assets/<name>.png` after a readiness wait. */
const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
  log(`wrote ${name}.png`);
};

/**
 * Records a video of `action`. Each video runs in its own context (Playwright
 * writes one webm per context) and the file is renamed to a stable name on
 * close. Returns once the webm is on disk.
 */
const video = async (
  browser: Browser,
  baseUrl: string,
  name: string,
  action: (page: Page) => Promise<void>
): Promise<void> => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-capture-vid-'));
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: tmpDir, size: VIEWPORT },
    baseURL: baseUrl,
  });
  // Inject the visible fake cursor so clicks/pointer travel are followable.
  await context.addInitScript(CURSOR_INIT_SCRIPT);
  const page = await context.newPage();
  try {
    await action(page);
  } finally {
    await page.close();
    await context.close();
  }
  // Playwright finalizes the webm on context close; move it to a stable name.
  // Copy + unlink rather than rename: the temp dir and OUT_DIR may live on
  // different filesystems (rename across devices throws EXDEV).
  const produced = fs.readdirSync(tmpDir).find(f => f.endsWith('.webm'));
  if (produced) {
    fs.copyFileSync(path.join(tmpDir, produced), path.join(OUT_DIR, `${name}.webm`));
    log(`wrote ${name}.webm`);
  } else {
    log(`WARN: no webm produced for ${name}`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
};

/** Opens the Plan Detail Graph tab and waits for the rendered mermaid SVG. */
const openGraph = async (page: Page, baseUrl: string, planKey: string): Promise<void> => {
  await page.goto(`${baseUrl}/plans/${encodeURIComponent(planKey)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('[role="tablist"]');
  await page.getByRole('tab', { name: 'Graph' }).click();
  await page.waitForSelector('[data-testid="graph"]');
  await page.waitForSelector('.mermaid-host svg', { timeout: 20_000 });
};

/** Opens the Plan Detail Tasks tab (Execute blueprint, Swimlanes by default). */
const openTasks = async (page: Page, baseUrl: string, planKey: string): Promise<void> => {
  await page.goto(`${baseUrl}/plans/${encodeURIComponent(planKey)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('[role="tablist"]');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await page.waitForSelector('[data-testid="swimlanes"]');
};

/** Runs every still-screenshot capture in the inventory. */
const captureStills = async (
  context: BrowserContext,
  baseUrl: string,
  picked: Picked | null,
  archived: boolean,
  config: { kind: string; id: string } | null
): Promise<void> => {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  try {
    // --- Plans: Board (default) and Cards ---
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('aside'); // persistent shell mounted
    await page.waitForSelector('[data-testid="board-column"]');
    await shot(page, 'plans-board');

    await page.getByText('Cards', { exact: true }).click();
    await page.waitForSelector('[data-testid="plan-card"]');
    await shot(page, 'plans-cards');

    if (picked) {
      const { detail, task, graphDetail } = picked;

      // --- Plan Detail: Plan tab (Reader + blueprint rail) ---
      await page.goto(`${baseUrl}/plans/${encodeURIComponent(detail.name)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('[role="tablist"]');
      await page.waitForSelector('[data-testid="reader"]');
      await shot(page, 'plan-detail-plan');

      // --- Plan Detail: Graph tab — uses the simpler, distinct graph plan ---
      await openGraph(page, baseUrl, graphDetail.name);
      await shot(page, 'plan-detail-graph');

      // --- Plan Detail: Tasks tab — Swimlanes (default) ---
      await openTasks(page, baseUrl, detail.name);
      await page.waitForSelector('[data-testid="swimlanes"]');
      await shot(page, 'plan-detail-tasks-swimlanes');

      // --- Task Detail: main body ---
      await page.goto(`${baseUrl}/plans/${encodeURIComponent(detail.name)}/tasks/${task.id}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('[data-testid="reader"]');
      await shot(page, 'task-detail');

      // --- Task Detail: Implementation Notes tab, when present ---
      const notesTab = page.getByRole('tab', { name: 'Implementation Notes' });
      if ((await notesTab.count()) > 0) {
        await notesTab.click();
        await page.waitForSelector('[data-testid="reader"]');
        await shot(page, 'task-detail-implementation-notes');
      } else {
        log('skip task-detail-implementation-notes.png (selected task has no notes section)');
      }
    } else {
      log('skip Plan Detail / Graph / Tasks / Task Detail stills (no plan with tasks found)');
    }

    // --- Archive: the full ("All") table ---
    await page.goto(`${baseUrl}/archive`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Archive' }).waitFor();
    if (archived) {
      // Archived rows render as `[data-testid="archive-row"]` entries under
      // inline month-group headings (there is no dedicated group container).
      await page.waitForSelector('[data-testid="archive-row"]');
    }
    await shot(page, 'archive-all');

    // --- Customize: hooks grid, templates grid, and the editor detail ---
    await page.goto(`${baseUrl}/customize`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="config-card"]');
    await shot(page, 'customize-hooks');

    await page.getByRole('tab', { name: 'Templates' }).click();
    await page.waitForSelector('[data-testid="config-card"]');
    await shot(page, 'customize-templates');

    if (config) {
      await page.goto(`${baseUrl}/customize/${config.kind}/${config.id}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('.cm-editor'); // CodeMirror mounted
      await shot(page, 'customize-detail-editor');
    } else {
      log('skip customize-detail-editor.png (no config files found)');
    }
  } finally {
    await page.close();
  }
};

/** Runs every interaction-video capture in the inventory. */
const captureVideos = async (
  browser: Browser,
  baseUrl: string,
  picked: Picked | null,
  config: { kind: string; id: string } | null
): Promise<void> => {
  if (picked) {
    const { detail, task } = picked;

    // Navigating Plans -> Plan Detail -> Task Detail as a human would: the
    // pointer visibly travels and CLICKS a plan card, then a blueprint task row
    // (no URL jumps — the whole point is followable interaction).
    await video(browser, baseUrl, 'nav-plans-to-task-detail', async page => {
      page.setDefaultTimeout(20_000);
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="board-column"]');
      await beat(page); // video pacing: hold on the Plans board
      // Click the primary plan's board card (navigates to detail).
      const planCard = page
        .locator('[data-testid="board-card"]', { hasText: `#${detail.id}` })
        .first();
      await planCard.hover(); // move the visible cursor to the card before clicking
      await planCard.click();
      await page.waitForSelector('[data-testid="reader"]');
      await beat(page); // video pacing: hold on the Plan Detail Reader
      // Open the Tasks tab so the swimlane task rows are visible and clickable.
      const tasksTab = page.getByRole('tab', { name: 'Tasks' });
      await tasksTab.hover();
      await tasksTab.click();
      await page.waitForSelector('[data-testid="swimlanes"]');
      await beat(page); // video pacing: hold on the execution blueprint
      // Click a clickable task card to navigate to its Task Detail page.
      const taskCard = page
        .locator('[data-testid="lane-task"]', { hasText: `task · ${pad2(task.id)}` })
        .first();
      await taskCard.hover(); // move the visible cursor to the task before clicking
      await taskCard.click();
      await page.waitForSelector('[data-testid="reader"]');
      await beat(page, 1200); // video pacing: final hold on Task Detail
    });

    // Switching Plan Detail tabs (Plan <-> Graph <-> Tasks).
    await video(browser, baseUrl, 'plan-detail-tab-switch', async page => {
      page.setDefaultTimeout(20_000);
      await page.goto(`${baseUrl}/plans/${encodeURIComponent(detail.name)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('[role="tablist"]');
      await page.waitForSelector('[data-testid="reader"]');
      await beat(page); // video pacing: hold on the Plan tab
      const graphTab = page.getByRole('tab', { name: 'Graph' });
      await graphTab.hover(); // move the visible cursor to the target before clicking
      await graphTab.click();
      await page.waitForSelector('.mermaid-host svg', { timeout: 20_000 });
      await beat(page); // video pacing: hold on the Graph tab
      const tasksTab = page.getByRole('tab', { name: 'Tasks' });
      await tasksTab.hover();
      await tasksTab.click();
      await page.waitForSelector('[data-testid="swimlanes"]');
      await beat(page); // video pacing: hold on the Tasks tab
      const planTab = page.getByRole('tab', { name: 'Plan' }).first();
      await planTab.hover();
      await planTab.click();
      await page.waitForSelector('[data-testid="reader"]');
      await beat(page, 1200); // video pacing: final hold back on the Plan tab
    });
  } else {
    log('skip plan-detail interaction videos (no plan with tasks found)');
  }

  // Switching Plans Board <-> Cards.
  await video(browser, baseUrl, 'plans-board-cards-switch', async page => {
    page.setDefaultTimeout(20_000);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="board-column"]');
    await beat(page); // video pacing: hold on the Board view
    const cardsTab = page.getByText('Cards', { exact: true });
    await cardsTab.hover(); // move the visible cursor to the target before clicking
    await cardsTab.click();
    await page.waitForSelector('[data-testid="plan-card"]');
    await beat(page); // video pacing: hold on the Cards view
    const boardTab = page.getByText('Board', { exact: true });
    await boardTab.hover();
    await boardTab.click();
    await page.waitForSelector('[data-testid="board-column"]');
    await beat(page, 1200); // video pacing: final hold back on the Board view
  });

  // Customize Detail: typing in the editor and triggering Save. The Save
  // persists to a real config file, so the original content is captured first
  // and restored afterward via the sanctioned config-write route — the harness
  // must leave the documented workspace pristine across runs.
  if (config) {
    const original = await readConfigContent(baseUrl, config.kind, config.id);
    try {
      await video(browser, baseUrl, 'customize-editor-save', async page => {
        page.setDefaultTimeout(20_000);
        await page.goto(`${baseUrl}/customize/${config.kind}/${config.id}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForSelector('.cm-editor');
        await beat(page); // video pacing: hold on the freshly mounted editor
        const editor = page.locator('.cm-editor .cm-content');
        await editor.hover(); // move the visible cursor to the editor before clicking
        await editor.click();
        await page.keyboard.press('Control+End');
        // `delay` types one character at a time so the edit is visibly typed.
        await page.keyboard.type('\n<!-- capture demo edit -->\n', { delay: 60 });
        await beat(page); // video pacing: hold on the typed-in content
        const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
        await saveBtn.hover(); // move the visible cursor to Save before clicking
        // Readiness: wait on the actual config-write PUT response rather than the
        // transient "saved" label — the save mutates a watched file, so the SSE
        // revalidation reloads the editor and clears the label almost immediately
        // (a race the slower, paced run loses). The response is the real signal.
        const saved = page.waitForResponse(
          r => r.request().method() === 'PUT' && r.url().includes('/api/config/') && r.ok()
        );
        await saveBtn.click();
        await saved;
        await beat(page, 1200); // video pacing: final hold on the saved state
      });
    } finally {
      if (original != null) {
        await fetch(`${baseUrl}/api/config/${config.kind}/${config.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: original }),
        }).catch(() => undefined);
      }
    }
  } else {
    log('skip customize-editor-save.webm (no config files found)');
  }
};

const main = async (): Promise<void> => {
  // Guard 1: the SPA must be built.
  if (!fs.existsSync(INDEX_HTML)) {
    skip(
      `dist-web not built (missing ${path.relative(REPO_ROOT, INDEX_HTML)}). ` +
        `Run \`npm run build:web\` first.`
    );
  }
  // Guard 2: the workspace to document must exist.
  if (!fs.existsSync(WORKSPACE_ROOT)) {
    skip(`no .ai/strikethroo/ workspace at ${WORKSPACE_ROOT}.`);
  }

  // Guard 3: Chromium must be installed — otherwise skip gracefully.
  let browser: Browser;
  try {
    // `slowMo` paces every Playwright action so the recorded interaction
    // videos are human-watchable (each click/type/navigation is visibly
    // separated). This also slows the stills phase, which only adds wall-clock
    // time and does not affect the screenshots.
    browser = await chromium.launch({ slowMo: 400 });
  } catch (err) {
    skip(
      `Chromium is not installed (${err instanceof Error ? err.message : String(err)}). ` +
        `Run \`npx playwright install chromium\`.`
    );
    return; // unreachable; satisfies the type checker
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let handle: ServeHandle | null = null;
  try {
    handle = await startServer({
      root: WORKSPACE_ROOT,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 100,
    });
    const baseUrl = handle.url;
    log(`serving ${WORKSPACE_ROOT} at ${baseUrl}`);

    const summaries = (await (await fetch(`${baseUrl}/api/plans`)).json()) as PlanSummary[];
    const picked = await selectPlan(baseUrl, summaries);
    if (picked) {
      log(`selected plan ${picked.detail.id} (${picked.detail.name}) for detail captures`);
      log(
        `selected plan ${picked.graphDetail.id} (${picked.graphDetail.name}) for the Graph capture`
      );
    } else {
      log('no plan with tasks available; detail captures will be skipped');
    }
    const archived = hasArchived(summaries);
    const config = await selectConfigId(baseUrl);

    // `deviceScaleFactor: 2` doubles pixel density so the still PNGs are
    // hi-res: the logical viewport stays 1440x900 but the captured pixels
    // become 2880x1800.
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      baseURL: baseUrl,
    });
    try {
      await captureStills(context, baseUrl, picked, archived, config);
    } finally {
      await context.close();
    }

    await captureVideos(browser, baseUrl, picked, config);

    // The README preview mirrors the Plans board still, kept in sync each run.
    fs.copyFileSync(
      path.join(OUT_DIR, 'plans-board.png'),
      path.join(OUT_DIR, 'readme-preview.png')
    );
    log('wrote readme-preview.png (copy of plans-board.png)');

    log(`done. Assets written to ${path.relative(REPO_ROOT, OUT_DIR)}/`);
  } finally {
    await browser.close();
    if (handle) {
      const closed = new Promise<void>(r => handle!.server.close(() => r()));
      handle.server.closeAllConnections();
      await closed;
    }
  }
};

main().catch(err => {
  console.error('[capture:web] fatal error:', err);
  process.exit(1);
});
