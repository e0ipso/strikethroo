/**
 * End-to-end check that a `serve --read-only` viewer offers no mutating
 * controls: no Archive or self-review action on Plans or Plan Detail, and no
 * Customize save, with the editors inert. Drives the built SPA (dist-web) in
 * Chromium against a disposable fixture workspace.
 *
 * If the build output or a Chromium binary is unavailable the suite skips
 * rather than failing, so it never blocks browser-less environments.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const assetsBuilt = fs.existsSync(path.join(ASSETS_DIR, 'index.html'));

const SHARED_CONFIG = path.resolve(
  process.cwd(),
  'src',
  '__tests__',
  'fixtures',
  'serve-workspace',
  'config'
);

const planMd = (id: number, title: string): string =>
  `---\nid: ${id}\nsummary: "${title}"\ncreated: 2026-05-28\n---\n# ${title}\n\nBody.\n`;

const taskMd = (id: number): string =>
  `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "completed"\nskills: [typescript]\n---\n# Task ${id}\n\nBody.\n`;

/** A done plan (Archive control), a drafted plan (Review control), and config. */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'read-only-e2e-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(path.join(root, 'archive'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
    'utf8'
  );
  const done = path.join(root, 'plans', '12--example');
  fs.mkdirSync(path.join(done, 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(done, 'plan-12--example.md'), planMd(12, 'Example Done Plan'));
  fs.writeFileSync(path.join(done, 'tasks', '01--first.md'), taskMd(1));
  const drafted = path.join(root, 'plans', '13--draft');
  fs.mkdirSync(drafted, { recursive: true });
  fs.writeFileSync(path.join(drafted, 'plan-13--draft.md'), planMd(13, 'Draft Plan'));
  fs.cpSync(SHARED_CONFIG, path.join(root, 'config'), { recursive: true });
  return root;
};

test.describe('Read-only viewer (Playwright, fixture)', () => {
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
      readOnly: true,
    });
  });

  test.afterEach(async () => {
    const done = new Promise<void>(r => handle.server.close(() => r()));
    handle.server.closeAllConnections();
    await done;
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  test('Plans views and Plan Detail offer no Archive or self-review action', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(handle.url, { waitUntil: 'domcontentloaded' });

    await page.getByText('Cards', { exact: true }).click();
    await page.getByTestId('plan-card').first().waitFor();
    expect(await page.getByTestId('plan-card').count()).toBe(2);
    await expect(page.getByRole('button', { name: 'Archive', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Review in self-review' })).toHaveCount(0);

    await page.getByText('Board', { exact: true }).click();
    await page.getByText('Draft Plan').first().waitFor();
    await expect(page.getByRole('button', { name: 'Review', exact: true })).toHaveCount(0);

    await page.goto(`${handle.url}/plans/13--draft`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Copy path' }).waitFor();
    await expect(page.getByRole('button', { name: 'Review in self-review' })).toHaveCount(0);
  });

  test('Customize shows files without save controls or editing', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    const hookFile = path.join(root, 'config', 'hooks', 'PRE_PLAN.md');
    const before = fs.readFileSync(hookFile, 'utf8');

    await page.goto(`${handle.url}/customize/hooks/PRE_PLAN`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cm-editor');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);

    const editor = page.locator('.cm-editor .cm-content');
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('read-only-marker');
    await expect(editor).not.toContainText('read-only-marker');
    expect(fs.readFileSync(hookFile, 'utf8')).toBe(before);

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab').nth(2).click();
    await page.getByTestId('workspace-config-form').waitFor();
    await expect(page.getByRole('button', { name: 'Save configuration' })).toHaveCount(0);
    await expect(
      page.getByRole('checkbox', { name: 'Enable code review', exact: true })
    ).toBeDisabled();
  });

  test('failed capability discovery keeps editing disabled through recovery', async ({ page }) => {
    let unavailable = true;
    await page.route('**/api/capabilities', route =>
      unavailable
        ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
        : route.continue()
    );
    const failed = page.waitForResponse(
      response => response.url().endsWith('/api/capabilities') && response.status() === 503
    );
    await page.goto(`${handle.url}/customize/hooks/PRE_PLAN`, { waitUntil: 'domcontentloaded' });
    await failed;
    const editor = page.locator('.cm-editor .cm-content');
    await editor.waitFor();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    await editor.click();
    await page.keyboard.type('blocked-edit-marker');
    await expect(editor).not.toContainText('blocked-edit-marker');

    unavailable = false;
    const recovered = page.waitForResponse(
      response => response.url().endsWith('/api/capabilities') && response.status() === 200
    );
    fs.appendFileSync(path.join(root, 'config', 'hooks', 'PRE_PLAN.md'), '\nExternal update.\n');
    await recovered;
    await expect(editor).toContainText('External update.');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    await editor.click();
    await page.keyboard.type('still-blocked-marker');
    await expect(editor).not.toContainText('still-blocked-marker');
  });
});
