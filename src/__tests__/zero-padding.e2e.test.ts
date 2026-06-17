/**
 * End-to-end regression for zero-padded plan ids.
 *
 * Verifies that UI paths derived from a plan's composite directory name keep
 * any leading zeros, so copied commands and task navigation work. This
 * prevents issue #24-style mismatches where the displayed/copied path used the
 * unpadded numeric id instead of the actual directory name.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const assetsBuilt = fs.existsSync(INDEX_HTML);

interface PlanSeed {
  id: number;
  slug: string;
  taskStatus?: string;
}

/**
 * Seeds a workspace with two zero-padded plans:
 *   - one drafted plan with no tasks (for the self-review modal test)
 *   - one ready plan with a single pending task (for task navigation)
 */
const makeFixtureWorkspace = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-zero-padding-fixture-'));

  const writePlan = ({ id, slug, taskStatus }: PlanSeed): void => {
    const padded = String(id).padStart(2, '0');
    const planDir = path.join(root, 'plans', `${padded}--${slug}`);
    const tasksDir = path.join(planDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(planDir, `plan-${padded}--${slug}.md`),
      `---\nid: ${id}\nsummary: "Fixture ${slug}"\ncreated: "2026-06-02"\n---\n\n# ${slug}\n\nPlan body.\n`
    );
    if (taskStatus) {
      fs.writeFileSync(
        path.join(tasksDir, '01--first-task.md'),
        `---\nid: 1\ngroup: "fixture"\ndependencies: []\nstatus: "${taskStatus}"\ncreated: "2026-06-02"\nskills: []\n---\n# First task\n`
      );
    }
  };

  writePlan({ id: 4, slug: 'ai-summary-cost-guardrail' }); // drafted
  writePlan({ id: 5, slug: 'task-nav-fixture', taskStatus: 'pending' }); // ready

  return root;
};

test.describe('Zero-padded plan ids (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let handle: ServeHandle;
  let root: string;
  let fakeBinDir: string;
  let originalPath: string | undefined;

  test.beforeAll(async () => {
    // Make a fake `self-review` binary available on PATH so the server reports
    // the capability as installed and the SPA renders the launcher variant.
    fakeBinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-fake-self-review-'));
    const fakeBinary = path.join(fakeBinDir, 'self-review');
    fs.writeFileSync(fakeBinary, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    originalPath = process.env.PATH;
    process.env.PATH = `${fakeBinDir}${path.delimiter}${process.env.PATH ?? ''}`;

    root = makeFixtureWorkspace();
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
  });

  test.afterAll(async () => {
    await new Promise<void>(r => handle.server.close(() => r()));
    if (root) fs.rmSync(root, { recursive: true, force: true });
    if (fakeBinDir) fs.rmSync(fakeBinDir, { recursive: true, force: true });
    process.env.PATH = originalPath;
  });

  test('Review modal command preserves leading zeros in the plan path', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });

      // Switch to Cards view and open the Review modal for the drafted plan.
      await page.getByText('Cards', { exact: true }).click();
      await page.getByTestId('plan-card').first().waitFor();
      await page.getByRole('button', { name: /Review in self-review/ }).click();

      const dialog = page.getByRole('dialog');
      await dialog.waitFor();

      // The displayed command must include the zero-padded directory name.
      const text = (await dialog.textContent()) ?? '';
      expect(text).toContain('.ai/strikethroo/plans/04--ai-summary-cost-guardrail/');
      expect(text).toContain('plan-04--ai-summary-cost-guardrail.md');
      expect(text).not.toContain('plans/4--ai-summary-cost-guardrail/');
      expect(text).not.toContain('plan-4--ai-summary-cost-guardrail.md');

      // The copied clipboard text must match the displayed command.
      await dialog.getByRole('button', { name: 'Copy command to clipboard' }).click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip).toBe(
        'self-review .ai/strikethroo/plans/04--ai-summary-cost-guardrail/plan-04--ai-summary-cost-guardrail.md'
      );
    } finally {
      await page.close();
    }
  });

  test('Tasks-tab task navigation keeps the composite zero-padded plan name', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/plans/05--task-nav-fixture`, {
        waitUntil: 'domcontentloaded',
      });

      // Switch to the Tasks tab.
      await page.getByRole('tab', { name: /Tasks/ }).click();
      await page.getByTestId('swimlanes').waitFor();

      // Click the first lane task; the detail route must use the composite name.
      await page.getByTestId('lane-task').first().click();
      await page.waitForFunction(
        () => /^\/plans\/05--task-nav-fixture\/tasks\/\d+$/.test(location.pathname),
        { timeout: 5_000 }
      );
      expect(page.url()).toContain('/plans/05--task-nav-fixture/tasks/');
    } finally {
      await page.close();
    }
  });
});
