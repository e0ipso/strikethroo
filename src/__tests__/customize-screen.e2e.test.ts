/**
 * End-to-end validation for the redesigned Customize section (Plan 100).
 *
 * Drives the built SPA (dist-web) in a real Chromium browser against a
 * DISPOSABLE workspace fixture — never the repo's own `.ai/strikethroo/` —
 * because the Save round-trip overwrites a config file on disk and the suite
 * must stay repeatable. The fixture copies the shared `serve-workspace`
 * config tree (its real hook/template files) into a fresh temp directory, so
 * the listing reflects live `/api/config` data and the write lands only there.
 *
 * It covers the critical user workflow worth covering per the project test
 * philosophy — browse the card grid for BOTH tabs, open a card's editor detail
 * route, edit + save with persistence verified on disk and across reload, and
 * the designed not-found surface — not CodeMirror or Playwright internals.
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

/**
 * A fresh, writable workspace whose `config/` tree is copied from the shared
 * read-only fixture. Returns the absolute `.ai/strikethroo` root. The Save test
 * mutates files here only; the temp tree is removed in teardown.
 */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'customize-e2e-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(path.join(root, 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'archive'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
    'utf8'
  );
  fs.cpSync(SHARED_CONFIG, path.join(root, 'config'), { recursive: true });
  return root;
};

test.describe('Customize section (Playwright, fixture)', () => {
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
    // The page may still hold its SSE connection open; force-terminate live
    // connections before close() so teardown is deterministic.
    const done = new Promise<void>(r => handle.server.close(() => r()));
    handle.server.closeAllConnections();
    await done;
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  test('both tabs render a multi-column card grid', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });

    // Hooks tab (default) renders the shared card grid.
    await page.getByTestId('config-card').first().waitFor();
    const hookCards = await page.getByTestId('config-card').count();
    expect(hookCards).toBeGreaterThan(0);

    // The grid lays cards out in more than one column (responsive multi-column).
    const columns = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="config-grid"]') as HTMLElement | null;
      if (!grid) return 0;
      const cols = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
      return cols.length;
    });
    expect(columns).toBeGreaterThan(1);

    // Switch to the Templates tab — same shared grid, still populated.
    await page.getByRole('tab').nth(1).click();
    await page.getByTestId('config-card').first().waitFor();
    expect(await page.getByTestId('config-card').count()).toBeGreaterThan(0);
  });

  test('a card shows the eyebrow path, title, and description', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();

    // The PRE_PLAN hook has a registry description, so its card carries all
    // three pieces. Locate it by title.
    const card = page
      .getByTestId('config-card')
      .filter({ has: page.getByTestId('config-card-title').filter({ hasText: /^PRE_PLAN$/ }) })
      .first();
    await expect(card).toHaveCount(1);

    expect(await card.getByTestId('config-card-eyebrow').textContent()).toBe(
      '.ai/strikethroo/config/hooks/PRE_PLAN.md'
    );
    expect(await card.getByTestId('config-card-title').textContent()).toBe('PRE_PLAN');
    expect((await card.getByTestId('config-card-desc').textContent())?.length ?? 0).toBeGreaterThan(
      0
    );
  });

  test('clicking a card opens the editor detail route', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();

    await page
      .getByTestId('config-card')
      .filter({ has: page.getByTestId('config-card-title').filter({ hasText: /^PRE_PLAN$/ }) })
      .first()
      .click();

    await page.waitForFunction(() => location.pathname.startsWith('/customize/'));
    expect(page.url()).toContain('/customize/hooks/PRE_PLAN');

    // The lazy CodeMirror editor chunk mounts.
    await page.waitForSelector('.cm-editor');
    expect(await page.locator('.cm-editor').count()).toBe(1);
  });

  test('editing and saving persists to disk and survives a reload', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    const detailUrl = `${handle.url}/customize/hooks/PRE_PLAN`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cm-editor');

    const marker = `\n<!-- e2e-marker-${Date.now()} -->\n`;

    // Append a unique marker by typing at the end of the document.
    const editor = page.locator('.cm-editor .cm-content');
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(marker);

    // Save and await the success indicator. The redesigned detail header renders
    // the save-status text ("saving…" → "saved") in the Chrome actions area.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByTestId('chrome-actions')).toContainText('saved', { timeout: 5_000 });

    // The marker landed on disk in the isolated fixture.
    const onDisk = fs.readFileSync(path.join(root, 'config', 'hooks', 'PRE_PLAN.md'), 'utf8');
    expect(onDisk).toContain('e2e-marker-');

    // And it survives a fresh load of the detail route (re-fetched content).
    // CodeMirror virtualizes off-screen lines, so move the cursor to the end so
    // the appended marker line is rendered before reading the document text.
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cm-editor');
    await page.locator('.cm-editor .cm-content').click();
    await page.keyboard.press('Control+End');
    await expect(page.locator('.cm-editor .cm-content')).toContainText('e2e-marker-');
  });

  test('Config tab: the routing form populates config.yaml and preserves foreign sections', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    // Seed a foreign top-level section a form save must not destroy.
    fs.writeFileSync(
      path.join(root, 'config', 'config.yaml'),
      'other_feature:\n  flag: true\nexecution_routing:\n  profiles: {}\n',
      'utf8'
    );

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();

    // Third tab is the generic workspace configuration form.
    await page.getByRole('tab').nth(2).click();
    await page.getByTestId('workspace-config-form').waitFor();

    // Manually populate one profile with one exact target.
    await page.getByRole('button', { name: 'Add profile' }).click();
    await page.getByTestId('routing-profile-name').fill('routine');
    await page
      .getByTestId('routing-profile-description')
      .fill('Localized, low-risk work with a low complexity score.');
    await page.getByTestId('routing-target-model').fill('exact-model-id');

    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(page.getByTestId('workspace-config-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // The exact section landed on disk and the foreign section survived.
    const onDisk = fs.readFileSync(path.join(root, 'config', 'config.yaml'), 'utf8');
    expect(onDisk).toContain('execution_routing:');
    expect(onDisk).toContain('routine:');
    expect(onDisk).toContain('model: exact-model-id');
    expect(onDisk).toContain('other_feature:');
    expect(onDisk).toContain('flag: true');
  });

  test('an unknown config id renders the designed not-found surface', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(`${handle.url}/customize/hooks/NOPE_DOES_NOT_EXIST`, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('[role="alert"]');
    const alert = await page.locator('[role="alert"]').innerText();
    expect(alert).toContain('NOPE_DOES_NOT_EXIST');
    expect(await page.locator('.cm-editor').count()).toBe(0);
  });
});
