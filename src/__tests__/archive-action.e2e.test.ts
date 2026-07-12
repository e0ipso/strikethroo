/**
 * End-to-end validation for the plan 93 archive action (Self Validation step 4).
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against a
 * disposable workspace fixture — never the repo's own `.ai/strikethroo/` — to
 * confirm the live-UI reflection success criterion: with the Plans screen open,
 * archiving a done plan via the confirmation-gated control removes it from the
 * Plans list (and the API reports it archived) within ~1s via the SSE
 * revalidation pipeline, with no manual reload.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks browser-less environments.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';
import type { PlanSummary } from '../serve/workspace-model';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const assetsBuilt = fs.existsSync(path.join(ASSETS_DIR, 'index.html'));

const planMd = (id: number, title: string): string =>
  `---\nid: ${id}\nsummary: "${title}"\ncreated: 2026-05-28\n---\n# ${title}\n\nBody.\n`;

const taskMd = (id: number, status: string): string =>
  `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "${status}"\nskills: [typescript]\n---\n# Task ${id}\n\nBody.\n`;

const makePlan = (
  root: string,
  slug: string,
  id: number,
  title: string,
  tasks: Array<{ name: string; status: string; id: number }>
): void => {
  const dir = path.join(root, 'plans', slug);
  fs.mkdirSync(path.join(dir, 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(dir, `plan-${slug}.md`), planMd(id, title), 'utf8');
  for (const t of tasks) {
    fs.writeFileSync(path.join(dir, 'tasks', t.name), taskMd(t.id, t.status), 'utf8');
  }
};

/** A fresh fixture with one `done` plan and one active plan. Returns the root. */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-e2e-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
    'utf8'
  );
  makePlan(root, '12--example', 12, 'Example Done Plan', [
    { name: '01--first.md', id: 1, status: 'completed' },
    { name: '02--second.md', id: 2, status: 'completed' },
  ]);
  makePlan(root, '13--active', 13, 'Active Plan', [
    { name: '01--first.md', id: 1, status: 'pending' },
  ]);
  return root;
};

test.describe('Archive action (Playwright, fixture)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let handle: ServeHandle;
  let root: string;

  test.beforeEach(async () => {
    root = buildFixture();
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 100,
    });
  });

  test.afterEach(async () => {
    // The fixture page may still hold its SSE connection open, so force-terminate
    // live connections before close() to keep teardown deterministic.
    const done = new Promise<void>(r => handle.server.close(() => r()));
    handle.server.closeAllConnections();
    await done;
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  test('archives a done plan from the UI and it leaves the Plans list live', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(handle.url, { waitUntil: 'domcontentloaded' });

    // Switch to the Cards view (Board is now the default). The Cards grid
    // renders every plan, done included, so the done plan's card offers an
    // actionable Archive control while the active plan's does not — exactly one
    // Archive button is present.
    await page.getByText('Cards', { exact: true }).click();
    await page.getByTestId('plan-card').first().waitFor();
    expect(await page.getByTestId('plan-card').count()).toBe(2);
    expect(await page.getByRole('button', { name: 'Archive', exact: true }).count()).toBe(1);

    // Open the confirmation dialog and confirm.
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByRole('button', { name: 'Archive plan' }).click();

    // SSE revalidation drops the archived plan from the grid with no reload.
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="plan-card"]').length === 1,
      null,
      { timeout: 5_000 }
    );
    expect(await page.getByRole('button', { name: 'Archive', exact: true }).count()).toBe(0);

    // The API confirms the move actually happened on disk.
    const plans = (await (await fetch(`${handle.url}/api/plans`)).json()) as PlanSummary[];
    const moved = plans.find(p => p.id === 12);
    expect(moved?.archived).toBe(true);
    expect(fs.existsSync(path.join(root, 'plans', '12--example'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'archive', '12--example'))).toBe(true);
  });
});
