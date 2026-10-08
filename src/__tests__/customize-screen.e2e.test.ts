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
import { test, expect, type Page } from '@playwright/test';
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

  test('a save rejected with 403 re-bootstraps the capability and retries once', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const capability = handle.capability ?? '';
    expect(capability).not.toBe('');

    // Count capability bootstraps the SPA issues through the real server.
    let bootstraps = 0;
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/session') bootstraps += 1;
    });

    // Simulate a server restart: the first save is refused as a stale
    // capability; every later attempt reaches the real, capability-guarded route.
    const presented: string[] = [];
    await page.route(`${handle.url}/api/config/hooks/PRE_PLAN`, async route => {
      presented.push(route.request().headers()['x-strikethroo-capability'] ?? '');
      if (presented.length === 1) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden.' }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${handle.url}/customize/hooks/PRE_PLAN`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cm-editor');
    const marker = `\n<!-- e2e-retry-${Date.now()} -->\n`;
    await page.locator('.cm-editor .cm-content').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(marker);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByTestId('chrome-actions')).toContainText('saved', { timeout: 5_000 });

    // Exactly one retry, after exactly one extra bootstrap, and it landed.
    expect(presented).toEqual([capability, capability]);
    expect(bootstraps).toBe(2);
    const onDisk = fs.readFileSync(path.join(root, 'config', 'hooks', 'PRE_PLAN.md'), 'utf8');
    expect(onDisk).toContain('e2e-retry-');

    // The capability lives only in memory: not in web storage or the URL.
    const exposed = await page.evaluate(() => {
      const w = globalThis as unknown as {
        localStorage: Record<string, string>;
        sessionStorage: Record<string, string>;
        location: { href: string };
      };
      return JSON.stringify([{ ...w.localStorage }, { ...w.sessionStorage }, w.location.href]);
    });
    expect(exposed).not.toContain(capability);
  });

  test('Config tab: the routing form populates config.yaml and preserves foreign sections', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    // Seed a foreign top-level section a form save must not destroy, plus an
    // existing harness entry the arguments form must show and extend in order.
    fs.writeFileSync(
      path.join(root, 'config', 'config.yaml'),
      'other_feature:\n  flag: true\n' +
        'harnesses:\n  codex:\n    cli_args:\n      - --sandbox\n      - workspace-write\n' +
        'execution_routing:\n  profiles: {}\n',
      'utf8'
    );

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();

    // Third tab is the generic workspace configuration form.
    await page.getByRole('tab').nth(2).click();
    await page.getByTestId('workspace-config-form').waitFor();
    await expect(page.getByText(/immediately before each delegation/i)).toBeVisible();
    await expect(page.getByText(/rejected targets join the task's avoid set/i)).toBeVisible();
    await expect(
      page.getByText(/all eligible targets for its profile, and the accumulated avoid set/i)
    ).toBeVisible();
    await expect(page.getByText(/selected target is written as the task's exact/i)).toHaveCount(0);

    const externalExecution = page.getByRole('checkbox', {
      name: 'Allow external harness execution',
    });
    await expect(externalExecution).not.toBeChecked();
    await expect(externalExecution).toHaveAccessibleDescription(
      /code review gate still uses a second harness/i
    );
    await externalExecution.check();

    // Manually populate one profile with one exact target.
    await page.getByRole('button', { name: 'Add profile' }).click();
    await page.getByTestId('routing-profile-name').fill('routine');
    await page
      .getByTestId('routing-profile-description')
      .fill('Localized, low-risk work with a low complexity score.');

    // Regression guard: the target row's three fields must all be usably wide.
    // A `w-full` baked into the shared field styling collides with the fixed
    // widths on the harness/effort controls (clsx concatenates, it does not
    // resolve Tailwind conflicts); the wrong class winning collapses the model
    // input to near-zero width so the user cannot see or use it.
    const modelBox = await page.getByTestId('routing-target-model').boundingBox();
    expect(modelBox?.width ?? 0).toBeGreaterThan(120);

    await page.getByTestId('routing-target-model').fill('exact-model-id');

    // The harness arguments section shows codex's seeded arguments in file
    // order; a third one is appended through its own "Add argument" control.
    const codex = page.locator('[data-testid="harness-args-card"][data-harness="codex"]');
    const codexArgs = codex.getByTestId('harness-arg-input');
    await expect(codexArgs).toHaveCount(2);
    await expect(codexArgs.nth(0)).toHaveValue('--sandbox');
    await expect(codexArgs.nth(1)).toHaveValue('workspace-write');
    await codex.getByRole('button', { name: 'Add argument' }).click();
    await codexArgs.nth(2).fill('--model');

    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(page.getByTestId('workspace-config-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // The exact section landed on disk and the foreign section survived.
    const onDisk = fs.readFileSync(path.join(root, 'config', 'config.yaml'), 'utf8');
    expect(onDisk).toContain('execution_routing:');
    expect(onDisk).toContain('allow_external_harness_execution: true');
    expect(onDisk).toContain('routine:');
    expect(onDisk).toContain('model: exact-model-id');
    expect(onDisk).toContain('other_feature:');
    expect(onDisk).toContain('flag: true');
    expect(onDisk).toMatch(
      /codex:\n\s+cli_args:\n\s+- --sandbox\n\s+- workspace-write\n\s+- --model/
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();
    await page.getByRole('tab').nth(2).click();
    await expect(externalExecution).toBeChecked();
    await externalExecution.uncheck();
    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(page.getByTestId('workspace-config-status')).toContainText('Saved');
    const disabled = fs.readFileSync(path.join(root, 'config', 'config.yaml'), 'utf8');
    expect(disabled).toContain('allow_external_harness_execution: false');
    expect(disabled).toContain('model: exact-model-id');
    expect(disabled).toContain('other_feature:');
  });

  test('Config tab: the routing switch turns routing off without dropping profiles', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const configPath = path.join(root, 'config', 'config.yaml');
    fs.writeFileSync(
      configPath,
      'execution_routing:\n' +
        '  enabled: true\n' +
        '  profiles:\n' +
        '    routine:\n' +
        '      description: Localized work.\n' +
        '      models:\n' +
        '        - model: exact-model-id\n',
      'utf8'
    );

    const openConfigTab = async () => {
      await page.getByTestId('config-card').first().waitFor();
      await page.getByRole('tab').nth(2).click();
      await page.getByTestId('workspace-config-form').waitFor();
    };

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await openConfigTab();

    // Seeded on: the switch is checked and the profile editor is usable.
    await expect(page.getByTestId('routing-enabled')).toBeChecked();
    await expect(page.getByTestId('routing-profile-name')).toBeEnabled();

    // Off: the editor goes inert without the profile leaving the form.
    await page.getByTestId('routing-enabled').uncheck();
    await expect(page.getByTestId('routing-profile-name')).toBeDisabled();
    await expect(page.getByTestId('routing-profile-name')).toHaveValue('routine');

    // Nothing in the editor stays operable, and the whole block dims.
    const controls = page.getByTestId('routing-editor').locator('input, select, textarea, button');
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(5);
    for (let i = 0; i < controlCount; i++) await expect(controls.nth(i)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Add profile' })).toBeDisabled();
    await expect(page.getByTestId('routing-resolver')).toBeDisabled();
    await expect(page.getByTestId('routing-editor')).toHaveClass(/opacity-50/);

    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(page.getByTestId('workspace-config-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // The switch landed on disk and the profile survived it.
    const onDisk = fs.readFileSync(configPath, 'utf8');
    expect(onDisk).toMatch(/execution_routing:\n\s+enabled: false/);
    expect(onDisk).toContain('routine:');
    expect(onDisk).toContain('model: exact-model-id');

    // And the saved state is what a fresh load shows.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openConfigTab();
    await expect(page.getByTestId('routing-enabled')).not.toBeChecked();
  });

  test('a reserved-character id opens, reloads, and traverses history to one file', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    // A space plus the three reserved characters that make link construction and
    // route parsing disagree unless both ends encode/decode exactly once.
    const id = 'WEIRD HOOK #1+2 50%';
    fs.writeFileSync(path.join(root, 'config', 'hooks', `${id}.md`), '# reserved\n', 'utf8');

    const detailPath = `/customize/hooks/${encodeURIComponent(id)}`;
    const atDetail = async () => {
      await page.waitForSelector('.cm-editor');
      expect(await page.locator('[role="alert"]').count()).toBe(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${id} hook`);
    };

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();
    await page.getByTestId('config-card').filter({ hasText: id }).first().click();
    expect(new URL(page.url()).pathname).toBe(detailPath);
    await atDetail();

    // Back to the grid, then forward through `popstate`.
    await page.goBack();
    await page.getByTestId('config-grid').waitFor();
    await page.goForward();
    await atDetail();

    // And a full reload of the encoded URL, which is where the browser reports
    // `location.pathname` percent-encoded.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await atDetail();
  });

  test('a malformed percent-encoding renders the not-found surface, not a blank screen', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();

    // The server refuses an undecodable request target with 400, so the only way
    // this reaches the SPA is client-side history, which is where `parsePath`
    // must not throw.
    await page.evaluate(() => {
      history.pushState({}, '', '/customize/hooks/%zz');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await page.waitForSelector('[role="alert"]');
    expect(await page.locator('[role="alert"]').innerText()).toContain('%zz');
    expect(errors).toEqual([]);
  });

  /* -------------------------------------------------------------------------
   * Draft preservation (plan 2, task 3). The editor keeps three values apart:
   * the draft, the baseline this editor last persisted, and the content most
   * recently observed on disk. These flows prove a live revalidation, a slow
   * save, or a failed background read cannot destroy typing.
   * ----------------------------------------------------------------------- */

  /** Reads the window-mirrored revalidation pass counter (see revalidation.tsx). */
  const revalidationCount = (page: Page): Promise<number> =>
    page.evaluate(
      () => (window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0
    );

  /**
   * Writes `content` to `file` and waits for the SPA to run a revalidation
   * pass. The shared `EventSource` has no replay, so a write that lands before
   * the stream opens is lost; the write is repeated (idempotently) until a pass
   * is observed.
   */
  const writeAndRevalidate = async (page: Page, file: string, content: string): Promise<void> => {
    const before = await revalidationCount(page);
    for (let attempt = 0; attempt < 10; attempt++) {
      fs.writeFileSync(file, content, 'utf8');
      try {
        await page.waitForFunction(
          prev =>
            ((window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0) >
            prev,
          before,
          { timeout: 1_500 }
        );
        return;
      } catch {
        // Stream not open yet; write again.
      }
    }
    throw new Error(`No revalidation pass observed after writing ${file}`);
  };

  /** Types `text` at the end of the CodeMirror document. */
  const appendToEditor = async (page: Page, text: string): Promise<void> => {
    await page.locator('.cm-editor .cm-content').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(text);
  };

  /**
   * Holds every PUT to `pathname` until the returned `release` is called; GETs
   * and other methods pass through untouched.
   */
  const holdSaves = async (page: Page, pathname: string): Promise<() => void> => {
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    await page.route(
      url => new URL(url).pathname === pathname,
      async route => {
        if (route.request().method() !== 'PUT') {
          await route.continue();
          return;
        }
        await held;
        await route.continue();
      }
    );
    return release;
  };

  /**
   * Holds every PUT to `pathname` twice: before it reaches the server
   * (`sendRequest`) and before its response reaches the page
   * (`deliverResponse`). Between the two the server has written the file, so
   * the live revalidation can observe the save's own write while the page
   * still has the save in flight. Other methods pass through untouched.
   */
  const holdSaveTwice = async (
    page: Page,
    pathname: string
  ): Promise<{ sendRequest: () => void; deliverResponse: () => void }> => {
    let sendRequest: () => void = () => {};
    let deliverResponse: () => void = () => {};
    const requestHeld = new Promise<void>(resolve => {
      sendRequest = resolve;
    });
    const responseHeld = new Promise<void>(resolve => {
      deliverResponse = resolve;
    });
    await page.route(
      url => new URL(url).pathname === pathname,
      async route => {
        if (route.request().method() !== 'PUT') {
          await route.continue();
          return;
        }
        await requestHeld;
        const response = await route.fetch();
        await responseHeld;
        await route.fulfill({ response });
      }
    );
    return { sendRequest, deliverResponse };
  };

  /**
   * Resolves once an `/api/config` re-read containing `observed` has arrived
   * and React has had two frames to fold it in. Start it before the write it
   * waits for. Matching on content matters: a pass already in flight when the
   * write starts would otherwise satisfy the wait with the old file. The pass
   * counter bumps when a pass starts, before its read lands, so it cannot
   * stand in for this.
   */
  const configReread = async (page: Page, observed: string): Promise<void> => {
    await page.waitForResponse(
      async response =>
        new URL(response.url()).pathname === '/api/config' &&
        response.request().method() === 'GET' &&
        (await response.text()).includes(observed)
    );
    await page.evaluate(
      () =>
        new Promise<void>(resolve =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
        )
    );
  };

  // POST_PLAN is five lines in the fixture, so CodeMirror renders the whole
  // document and `.cm-content` text assertions see every line.
  const SHORT_HOOK = 'POST_PLAN';
  const hookVersion = (label: string) => `# ${SHORT_HOOK}\n\n${label}\n`;

  test('Markdown editor: a dirty draft survives an external disk change and the conflict is explicit', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const hookPath = path.join(root, 'config', 'hooks', `${SHORT_HOOK}.md`);
    fs.writeFileSync(hookPath, hookVersion('seed version'), 'utf8');

    await page.goto(`${handle.url}/customize/hooks/${SHORT_HOOK}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.cm-editor');
    const content = page.locator('.cm-editor .cm-content');
    const actions = page.getByTestId('chrome-actions');
    const conflict = page.getByTestId('config-disk-conflict');
    await expect(content).toContainText('seed version');

    // Clean editor: the external change is adopted.
    await writeAndRevalidate(page, hookPath, hookVersion('external version one'));
    await expect(content).toContainText('external version one');
    await expect(conflict).toHaveCount(0);
    await expect(actions).toContainText('no changes');

    // Dirty editor: the typed text stays and the change on disk is reported.
    await appendToEditor(page, 'draft marker');
    await expect(actions).toContainText('unsaved changes');
    await writeAndRevalidate(page, hookPath, hookVersion('external version two'));
    await expect(conflict).toBeVisible();
    await expect(content).toContainText('draft marker');
    await expect(content).toContainText('external version one');
    await expect(content).not.toContainText('external version two');
    await expect(actions).toContainText('unsaved changes');
    expect(await page.locator('.cm-editor').count()).toBe(1);

    // Keep editing dismisses the banner for this disk version.
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(conflict).toHaveCount(0);
    await expect(content).toContainText('draft marker');

    // A revalidation that re-reads identical content changes nothing.
    const unrelated = path.join(root, 'config', 'hooks', 'PRE_PLAN.md');
    await writeAndRevalidate(page, unrelated, fs.readFileSync(unrelated, 'utf8') + '\n');
    await expect(conflict).toHaveCount(0);
    await expect(content).toContainText('draft marker');
    await expect(actions).toContainText('unsaved changes');

    // A further disk change brings the banner back; loading it is confirmed
    // and discards the draft.
    await writeAndRevalidate(page, hookPath, hookVersion('external version three'));
    await expect(conflict).toBeVisible();
    await page.getByRole('button', { name: 'Load disk version' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Discard and load' }).click();
    await expect(content).toContainText('external version three');
    await expect(content).not.toContainText('draft marker');
    await expect(conflict).toHaveCount(0);
    await expect(actions).toContainText('no changes');
  });

  test('Markdown editor: a save resolving after further typing advances the baseline to the submitted snapshot only', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const hookPath = path.join(root, 'config', 'hooks', `${SHORT_HOOK}.md`);
    fs.writeFileSync(hookPath, hookVersion('seed version'), 'utf8');
    const release = await holdSaves(page, `/api/config/hooks/${SHORT_HOOK}`);

    await page.goto(`${handle.url}/customize/hooks/${SHORT_HOOK}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.cm-editor');
    const content = page.locator('.cm-editor .cm-content');
    const actions = page.getByTestId('chrome-actions');

    await appendToEditor(page, 'marker A');
    const before = await revalidationCount(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('saving');

    // Typing while the request is in flight.
    await appendToEditor(page, ' marker B');
    expect(fs.readFileSync(hookPath, 'utf8')).not.toContain('marker A');

    release();
    await expect(actions).toContainText('unsaved changes');
    const onDisk = fs.readFileSync(hookPath, 'utf8');
    expect(onDisk).toContain('marker A');
    expect(onDisk).not.toContain('marker B');
    await expect(content).toContainText('marker A marker B');

    // The post-save re-read matches the new baseline: no conflict.
    await page.waitForFunction(
      prev =>
        ((window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0) >
        prev,
      before
    );
    await expect(page.getByTestId('config-disk-conflict')).toHaveCount(0);
    await expect(content).toContainText('marker A marker B');

    // The next save persists the whole draft.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('saved');
    expect(fs.readFileSync(hookPath, 'utf8')).toContain('marker A marker B');
  });

  test('Markdown editor: failed saves and failed background re-reads keep the draft and recover', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const hookPath = path.join(root, 'config', 'hooks', `${SHORT_HOOK}.md`);
    fs.writeFileSync(hookPath, hookVersion('seed version'), 'utf8');

    let failReads = false;
    let failSaves = false;
    await page.route(
      url => new URL(url).pathname.startsWith('/api/config'),
      async route => {
        const method = route.request().method();
        const pathname = new URL(route.request().url()).pathname;
        if (failReads && method === 'GET' && pathname === '/api/config') {
          await route.abort('failed');
          return;
        }
        if (failSaves && method === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Failed to write config file.' }),
          });
          return;
        }
        await route.continue();
      }
    );

    await page.goto(`${handle.url}/customize/hooks/${SHORT_HOOK}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.cm-editor');
    const content = page.locator('.cm-editor .cm-content');
    const actions = page.getByTestId('chrome-actions');
    const readError = page.getByTestId('config-read-error');
    await appendToEditor(page, 'draft marker');

    // A failed save keeps the draft and reports a recoverable error.
    failSaves = true;
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('save failed: Failed to write config file.');
    await expect(content).toContainText('draft marker');
    expect(fs.readFileSync(hookPath, 'utf8')).not.toContain('draft marker');
    failSaves = false;

    // A failed background re-read keeps the editor mounted with its draft.
    failReads = true;
    const unrelated = path.join(root, 'config', 'hooks', 'PRE_PLAN.md');
    await writeAndRevalidate(page, unrelated, fs.readFileSync(unrelated, 'utf8') + '\n');
    await expect(readError).toBeVisible();
    await expect(content).toContainText('draft marker');
    expect(await page.locator('.cm-editor').count()).toBe(1);

    // The next successful re-read clears the error; the draft is untouched.
    failReads = false;
    await writeAndRevalidate(page, unrelated, fs.readFileSync(unrelated, 'utf8') + '\n');
    await expect(readError).toHaveCount(0);
    await expect(content).toContainText('draft marker');

    // And the draft still saves.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('saved');
    expect(fs.readFileSync(hookPath, 'utf8')).toContain('draft marker');
  });

  test('Config tab: the form keeps a dirty draft through external changes and an in-flight save', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const configPath = path.join(root, 'config', 'config.yaml');
    const yamlWith = (model: string, description = 'Localized work.') =>
      'execution_routing:\n' +
      '  enabled: true\n' +
      '  profiles:\n' +
      '    routine:\n' +
      `      description: ${description}\n` +
      '      models:\n' +
      `        - model: ${model}\n`;
    fs.writeFileSync(configPath, yamlWith('model-one'), 'utf8');
    const release = await holdSaves(page, '/api/config/workspace/config');

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();
    await page.getByRole('tab').nth(2).click();
    await page.getByTestId('workspace-config-form').waitFor();

    const model = page.getByTestId('routing-target-model');
    const description = page.getByTestId('routing-profile-description');
    const status = page.getByTestId('workspace-config-status');
    const conflict = page.getByTestId('config-disk-conflict');
    await expect(model).toHaveValue('model-one');

    // Clean form: the external change is adopted.
    await writeAndRevalidate(page, configPath, yamlWith('model-two'));
    await expect(model).toHaveValue('model-two');
    await expect(conflict).toHaveCount(0);

    // Dirty form: the draft stays and the change on disk is reported.
    await description.fill('Edited while the file changed.');
    await expect(status).toContainText('Unsaved changes');
    await writeAndRevalidate(page, configPath, yamlWith('model-three'));
    await expect(conflict).toBeVisible();
    await expect(description).toHaveValue('Edited while the file changed.');
    await expect(model).toHaveValue('model-two');

    // Loading the disk version is confirmed and discards the draft.
    await page.getByRole('button', { name: 'Load disk version' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Discard and load' }).click();
    await expect(model).toHaveValue('model-three');
    await expect(description).toHaveValue('Localized work.');
    await expect(conflict).toHaveCount(0);

    // Delayed save: edits made while the request is in flight survive, and
    // only the submitted snapshot becomes the baseline.
    await description.fill('Submitted description.');
    const before = await revalidationCount(page);
    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(status).toContainText('Saving');
    await page.getByTestId('routing-resolver').fill('./scripts/select-target.cjs');
    release();
    await expect(status).toContainText('Unsaved changes');
    const onDisk = fs.readFileSync(configPath, 'utf8');
    expect(onDisk).toContain('Submitted description.');
    expect(onDisk).not.toContain('select-target.cjs');
    await expect(page.getByTestId('routing-resolver')).toHaveValue('./scripts/select-target.cjs');

    // The post-save re-read serializes to the submitted baseline: no conflict.
    await page.waitForFunction(
      prev =>
        ((window as unknown as { __stRevalidationCount?: number }).__stRevalidationCount ?? 0) >
        prev,
      before
    );
    await expect(conflict).toHaveCount(0);
    await expect(page.getByTestId('routing-resolver')).toHaveValue('./scripts/select-target.cjs');

    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(status).toContainText('Saved');
    expect(fs.readFileSync(configPath, 'utf8')).toContain('select-target.cjs');
  });

  test("Markdown editor: a revert typed during a save survives the save's own write being observed before its response", async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const hookPath = path.join(root, 'config', 'hooks', `${SHORT_HOOK}.md`);
    const seed = hookVersion('seed version');
    fs.writeFileSync(hookPath, seed, 'utf8');
    const { sendRequest, deliverResponse } = await holdSaveTwice(
      page,
      `/api/config/hooks/${SHORT_HOOK}`
    );

    await page.goto(`${handle.url}/customize/hooks/${SHORT_HOOK}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.cm-editor');
    const content = page.locator('.cm-editor .cm-content');
    const actions = page.getByTestId('chrome-actions');
    const marker = 'marker A';

    await appendToEditor(page, marker);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('saving');

    // While the request is held the user deletes the marker again, so the
    // draft equals the old baseline and reads clean against it.
    await content.click();
    await page.keyboard.press('Control+End');
    for (let i = 0; i < marker.length; i++) await page.keyboard.press('Backspace');
    await expect(content).not.toContainText(marker);

    // The server writes the submission and the live revalidation observes it
    // while the response is still held. The revert must not be adopted over.
    const reread = configReread(page, marker);
    sendRequest();
    await reread;
    expect(fs.readFileSync(hookPath, 'utf8')).toContain(marker);
    await expect(content).not.toContainText(marker);
    await expect(actions).toContainText('saving');

    // The response lands: the submission is the baseline now, so the revert
    // is an unsaved edit rather than a clean editor.
    deliverResponse();
    await expect(actions).toContainText('unsaved changes');
    await expect(content).not.toContainText(marker);
    await expect(page.getByTestId('config-disk-conflict')).toHaveCount(0);

    // Saving again persists the revert.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(actions).toContainText('saved');
    expect(fs.readFileSync(hookPath, 'utf8')).toBe(seed);
  });

  test("Config tab: a form edit reverted during a save survives the save's own write being observed before its response", async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    const configPath = path.join(root, 'config', 'config.yaml');
    fs.writeFileSync(
      configPath,
      'execution_routing:\n' +
        '  enabled: true\n' +
        '  profiles:\n' +
        '    routine:\n' +
        '      description: Localized work.\n' +
        '      models:\n' +
        '        - model: model-one\n',
      'utf8'
    );
    const { sendRequest, deliverResponse } = await holdSaveTwice(
      page,
      '/api/config/workspace/config'
    );

    await page.goto(`${handle.url}/customize`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('config-card').first().waitFor();
    await page.getByRole('tab').nth(2).click();
    await page.getByTestId('workspace-config-form').waitFor();

    const description = page.getByTestId('routing-profile-description');
    const status = page.getByTestId('workspace-config-status');
    await expect(description).toHaveValue('Localized work.');

    await description.fill('Submitted description.');
    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(status).toContainText('Saving');

    // Reverted while the request is held: the form serializes to the old
    // baseline again.
    await description.fill('Localized work.');

    const reread = configReread(page, 'Submitted description.');
    sendRequest();
    await reread;
    expect(fs.readFileSync(configPath, 'utf8')).toContain('Submitted description.');
    await expect(description).toHaveValue('Localized work.');
    await expect(status).toContainText('Saving');

    deliverResponse();
    await expect(status).toContainText('Unsaved changes');
    await expect(description).toHaveValue('Localized work.');
    await expect(page.getByTestId('config-disk-conflict')).toHaveCount(0);

    await page.getByRole('button', { name: 'Save configuration' }).click();
    await expect(status).toContainText('Saved');
    const onDisk = fs.readFileSync(configPath, 'utf8');
    expect(onDisk).toContain('description: Localized work.');
    expect(onDisk).not.toContain('Submitted description.');
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
