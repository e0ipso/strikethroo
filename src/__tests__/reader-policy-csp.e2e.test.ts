/**
 * End-to-end verification of the markdown reader policy, the locked mermaid
 * configuration, and the Content Security Policy — the three layers that keep
 * authored workspace documents inert (security audit A8/A9).
 *
 * Drives the production build (dist-web) through the real `serve` server in a
 * real Chromium against a DISPOSABLE workspace seeded from the committed
 * hostile fixture (`src/__tests__/fixtures/hostile-reader/`). The fixture is
 * deliberately kept out of the shared `serve-workspace` fixture, whose plan
 * count other suites assert on.
 *
 * One critical-path run covers the three layers together, because they must
 * agree: the sanitizer must leave no control or overlay behind, the diagram
 * must render with its hostile `%%{init}%%` denied, and the CSP must stay
 * silent across every surface the app has — plans, reader, Graph, Tasks, task
 * detail, theme toggle, and the CodeMirror editor — while still blocking what
 * the sanitizer is meant to have removed. Network requests and CSP violations
 * are recorded for the whole run and asserted at the end.
 *
 * If the build output or a Chromium binary is unavailable the suite skips rather
 * than failing, so it never blocks environments without browsers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, type Page } from '@playwright/test';
import { startServer, ServeHandle, CONTENT_SECURITY_POLICY } from '../serve/server';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');
const FIXTURES = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures');
const HOSTILE_PLANS = path.join(FIXTURES, 'hostile-reader', 'plans');
const SHARED_CONFIG = path.join(FIXTURES, 'serve-workspace', 'config');
const PLAN = '905--hostile-reader';

const assetsBuilt = fs.existsSync(INDEX_HTML);

/**
 * A fresh workspace holding the hostile plan plus the shared config tree (the
 * Customize editor needs a real hook file to open). Returns the `.ai/strikethroo`
 * root; the caller removes the temp tree.
 */
const buildFixture = (): string => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'st-hostile-reader-'));
  const root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(path.join(root, 'archive'), { recursive: true });
  fs.cpSync(HOSTILE_PLANS, path.join(root, 'plans'), { recursive: true });
  fs.cpSync(SHARED_CONFIG, path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.init-metadata.json'),
    JSON.stringify({ version: '0.0.0', workspaceSchemaVersion: 4 }),
    'utf8'
  );
  return root;
};

interface Recorder {
  /** Every request URL the page issued, in order. */
  requests: string[];
  /** `securitypolicyviolation` events, drained across full navigations. */
  violations: string[];
  /** Console lines Chromium prints for CSP refusals — a second channel. */
  consoleRefusals: string[];
  /** Pulls the in-page violation list into `violations` (call before each `goto`). */
  drain: () => Promise<void>;
}

/** Installs the request, violation, and console recorders on a fresh page. */
const record = async (page: Page): Promise<Recorder> => {
  const rec: Recorder = {
    requests: [],
    violations: [],
    consoleRefusals: [],
    drain: async () => {
      const found = await page.evaluate(() => {
        const w = window as unknown as { __cspViolations?: string[] };
        const list = w.__cspViolations ?? [];
        w.__cspViolations = [];
        return list;
      });
      rec.violations.push(...found);
    },
  };
  page.on('request', r => rec.requests.push(r.url()));
  page.on('console', m => {
    if (/Content Security Policy|Refused to/i.test(m.text())) rec.consoleRefusals.push(m.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: string[] };
    w.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', e => {
      w.__cspViolations.push(
        `${e.violatedDirective} blocked=${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}`
      );
    });
  });
  return rec;
};

/**
 * Elements the policy must never leave inside rendered prose. Scoped to the
 * reader but excluding the mermaid host, whose SVG legitimately carries ids,
 * styles, and an `<svg>`.
 */
const FORBIDDEN_IN_PROSE = [
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'video',
  'audio',
  'link',
  'meta',
  'base',
  'style',
  'script',
  'math',
  'svg',
  '[style]',
  '[id]',
  '.fixed',
  '.inset-0',
  '.prose-lg',
  // marked never emits a class on a paragraph; one here is author-supplied.
  'p[class]',
].map(sel => `[data-testid="reader"] ${sel}:not([data-testid="reader-mermaid"] *)`);

const countForbidden = (page: Page): Promise<Record<string, number>> =>
  page.evaluate(selectors => {
    const out: Record<string, number> = {};
    for (const sel of selectors) out[sel] = document.querySelectorAll(sel).length;
    return out;
  }, FORBIDDEN_IN_PROSE);

const zeroes = Object.fromEntries(FORBIDDEN_IN_PROSE.map(sel => [sel, 0]));

test.describe('Reader policy, mermaid lock-down, and CSP (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let handle: ServeHandle;
  let root: string;

  test.beforeAll(async () => {
    root = buildFixture();
    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 150,
    });
  });

  test.afterAll(async () => {
    const done = new Promise<void>(r => handle.server.close(() => r()));
    handle.server.closeAllConnections();
    await done;
    fs.rmSync(path.resolve(root, '..', '..'), { recursive: true, force: true });
  });

  test('renders hostile documents inert, denies the mermaid init directive, and stays CSP-clean', async ({
    page,
  }) => {
    page.setDefaultTimeout(20_000);
    const rec = await record(page);
    try {
      // Plans home, then the hostile plan's reader. The document response must
      // carry the exact policy the server pins.
      await page.goto(handle.url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('complementary').waitFor();
      await rec.drain();
      const response = await page.goto(`${handle.url}/plans/${PLAN}`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.headers()['content-security-policy']).toBe(CONTENT_SECURITY_POLICY);
      await page.getByTestId('reader').waitFor();
      await page.getByTestId('reader-mermaid').waitFor();

      // Forbidden controls, embeds, overlays, author styling, and ids are gone.
      expect(await countForbidden(page)).toEqual(zeroes);
      const reader = page.getByTestId('reader');

      // Inert structure still renders: table alignment, details, code, tasks.
      expect(await reader.locator('table th[align="right"]').count()).toBe(1);
      const detail = reader.locator('details', { has: page.getByText('Collapsed detail') });
      expect(await detail.count()).toBe(1);
      await expect(detail).toContainText('Detail body with inline code.');
      await expect(reader.locator('pre code.language-ts')).toContainText('const safe = true;');
      expect(await reader.locator('li.md-task').count()).toBe(2);
      expect(await reader.locator('li.md-task--done').count()).toBe(1);
      expect(await reader.locator('kbd').count()).toBe(2);
      expect(await reader.locator('del, sub, sup').count()).toBe(3);

      // URL policy on links: external links are hardened, javascript: is
      // stripped to inert text, fragments and relative paths survive.
      const external = reader.locator('a[href="https://example.invalid/page"]');
      await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(external).toHaveAttribute('target', '_blank');
      await expect(external).toHaveAttribute('title', 'external');
      const jsLink = reader.locator('a', { hasText: 'javascript link' });
      expect(await jsLink.count()).toBe(1);
      expect(await jsLink.getAttribute('href')).toBeNull();
      expect(await reader.locator('a[href="#context"]').count()).toBe(1);
      expect(await reader.locator('a[href="../relative/doc.md"]').count()).toBe(1);

      // URL policy on images: no remote source survives; the one with alt text
      // became its alt text, the one without became a plain hardened link.
      expect(await reader.locator('img[src^="http"], img[src^="//"]').count()).toBe(0);
      await expect(reader).toContainText('remote tracking pixel');
      const noAlt = reader.locator('a[href="https://example.invalid/no-alt.png"]');
      await expect(noAlt).toHaveText('https://example.invalid/no-alt.png');
      await expect(noAlt).toHaveAttribute('rel', 'noopener noreferrer');
      expect(await reader.locator('img[src="./diagram.png"]').count()).toBe(1);
      expect(await reader.locator('img[src^="data:image/png;base64,"]').count()).toBe(1);

      // The inline diagram rendered through the lazy boundary, inside its host.
      await page.waitForSelector('[data-testid="reader-mermaid"] .mermaid-host svg');

      // Graph tab: the diagram renders despite `maxTextSize: 1`, `loose` did
      // not take effect (the onerror handler never ran), and the themeCSS url
      // never reached the SVG.
      await page.getByRole('tab', { name: 'Graph' }).click();
      await page.waitForSelector('[data-testid="graph-canvas"] .mermaid-host svg');
      const graphSvg = await page.locator('[data-testid="graph-canvas"] .mermaid-host').innerHTML();
      expect(graphSvg).not.toContain('example.invalid');
      expect(graphSvg).not.toContain('onerror');
      // `theme: forest` is denied by OUR secure list (not mermaid's default
      // one): the forest primary fill never reaches the SVG.
      expect(graphSvg.toLowerCase()).not.toContain('#cde498');
      const mermaidPwned = await page.evaluate(
        () => (window as unknown as { __mermaidPwned?: number }).__mermaidPwned
      );
      expect(mermaidPwned).toBeUndefined();

      // Tasks tab, then into the hostile task's detail reader.
      await page.getByRole('tab', { name: /^Tasks/ }).click();
      await page.getByTestId('lane-task').first().waitFor();
      await page.getByTestId('lane-task').first().click();
      await page.waitForFunction(() => /\/tasks\/1$/.test(location.pathname));
      await page.getByTestId('reader').waitFor();
      expect(await countForbidden(page)).toEqual(zeroes);
      await expect(page.getByTestId('reader')).toContainText('task pixel');
      const taskLink = page.getByTestId('reader').locator('a[href="https://example.invalid/doc"]');
      await expect(taskLink).toHaveAttribute('target', '_blank');

      // Theme toggle round trip: the token swap is class-based, no inline style.
      await page.getByRole('button', { name: 'Dark theme' }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.getByRole('button', { name: 'Light theme' }).click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await page.getByRole('button', { name: 'System theme' }).click();

      // The CodeMirror editor mounts (it injects its own <style> elements).
      await rec.drain();
      await page.goto(`${handle.url}/customize/hooks/PRE_PLAN`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cm-editor');
      await page.locator('.cm-editor .cm-content').click();
      await page.keyboard.type('x');
      await rec.drain();

      // Nothing ever reached the third-party host, and the CSP never fired.
      const thirdParty = rec.requests.filter(u => u.includes('example.invalid'));
      expect(thirdParty).toEqual([]);
      expect(rec.violations).toEqual([]);
      expect(rec.consoleRefusals).toEqual([]);

      // Observed traffic, for the record: every request is same-origin.
      const origin = new URL(handle.url).origin;
      const paths = [...new Set(rec.requests.map(u => new URL(u).pathname))].sort();
      expect(rec.requests.every(u => u.startsWith(origin))).toBe(true);
      console.log(
        `[reader-policy-csp] ${rec.requests.length} requests, paths:\n  ${paths.join('\n  ')}`
      );
    } finally {
      await page.close();
    }
  });

  test('the shipped index.html has no inline script, so script-src needs no hash', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const inline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
      m => !/\bsrc=/.test(m[1] ?? '')
    );
    expect(inline).toEqual([]);
    // The pre-paint theme guard is the self-hosted classic script, loaded in
    // <head> before the module entry.
    expect(html).toMatch(/<head>[\s\S]*<script src="\/theme-guard\.js"><\/script>[\s\S]*<\/head>/);
    expect(fs.existsSync(path.join(ASSETS_DIR, 'theme-guard.js'))).toBe(true);
  });
});
