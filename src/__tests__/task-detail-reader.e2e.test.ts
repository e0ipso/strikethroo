/**
 * End-to-end verification for the Task Detail screen
 * (`/plans/:id/tasks/:taskId`) after Plan 99's refactor to render the task body
 * through the shared `Section` renderer.
 *
 * Drives the built SPA (dist-web) in a real Chromium browser. Per the project
 * test philosophy ("a few tests, mostly integration"), this is a small set of
 * critical-path runs covering the app-specific behavior the refactor
 * introduces — `##` heading parity (`.reader__h2 .hash`), inline mermaid
 * activation (`.mermaid-host svg`, unlike the Plan reader which shows the fence
 * as inert source), the Implementation Notes tab slicing, and the empty-body
 * graceful state — not per-component unit suites for the shared `Section`
 * component (already covered by the Plan Detail Reader specs) nor a re-test of
 * `marked`/`mermaid` themselves.
 *
 * Expectations are derived from disposable temp-workspace fixtures whose task
 * bodies are seeded the same way the plan-detail fixtures are (real files on
 * disk, served by the live serve API — never a mocked API). If the build output
 * or a Chromium binary is unavailable the suite skips rather than failing.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const INDEX_HTML = path.join(ASSETS_DIR, 'index.html');

const assetsBuilt = fs.existsSync(INDEX_HTML);

/**
 * A rich task body that exercises all three refactor behaviors in one fixture:
 * a `##` heading, an inline ` ```mermaid ` fence, and an `## Implementation
 * Notes` tail section.
 */
const RICH_TASK_BODY = `# Build the widget pipeline

## Objective

Wire the widget pipeline end to end.

\`\`\`mermaid
flowchart LR
  A[Start] --> B[End]
\`\`\`

## Acceptance Criteria

- The pipeline runs to completion.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

A noteworthy event documented during execution.
</details>
`;

/** A task body with a `##` heading but no Implementation Notes section. */
const NO_NOTES_TASK_BODY = `# Document the API

## Objective

Write the API reference, with no execution notes appended.
`;

/**
 * A task body whose only heading is the level-1 title, with prose but no `##`
 * sections. Exercises the no-section fallback: the body must render the prose
 * WITHOUT re-emitting the title as a second `<h1>` (the page heading already
 * shows it).
 */
const TITLE_ONLY_TASK_BODY = `# Configure the deployment pipeline

Some plain prose with no level-two headings at all.
`;

/**
 * Seeds a disposable workspace with a single plan and three tasks:
 *   1 — rich (heading + mermaid + Implementation Notes)
 *   2 — no notes
 *   3 — empty body (frontmatter only)
 * Returns the workspace root.
 */
const makeFixtureWorkspace = (id: number, slug: string): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'st-task-detail-fixture-'));
  const planDir = path.join(root, 'plans', `${id}--${slug}`);
  const tasksDir = path.join(planDir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(
    path.join(planDir, `plan-${id}--${slug}.md`),
    `---\nid: ${id}\nsummary: "Fixture plan"\ncreated: "2026-05-29"\n---\n\n# ${slug}\n\nFixture plan body.\n`
  );

  const writeTask = (taskId: number, taskSlug: string, body: string): void => {
    fs.writeFileSync(
      path.join(tasksDir, `0${taskId}--${taskSlug}.md`),
      `---\nid: ${taskId}\ngroup: "fixture"\ndependencies: []\nstatus: "pending"\ncreated: "2026-05-29"\nskills:\n  - playwright\n---\n${body}`
    );
  };

  writeTask(1, 'rich', RICH_TASK_BODY);
  writeTask(2, 'no-notes', NO_NOTES_TASK_BODY);
  writeTask(4, 'title-only', TITLE_ONLY_TASK_BODY);
  // Empty-body task: frontmatter only, no markdown body at all.
  fs.writeFileSync(
    path.join(tasksDir, '03--empty.md'),
    `---\nid: 3\ngroup: "fixture"\ndependencies: []\nstatus: "pending"\ncreated: "2026-05-29"\nskills: []\n---\n`
  );

  return root;
};

test.describe('Task Detail Reader (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let handle: ServeHandle;
  let root: string;

  test.beforeAll(async () => {
    root = makeFixtureWorkspace(901, 'task-detail-fixture');
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
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('rich task: heading parity, inline mermaid SVG, and Implementation Notes tab', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/plans/901/tasks/1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.reader');

      // (a) Heading parity: a `##` section renders a `.reader__h2` carrying the
      //     leading `##` hash affordance — the same selector the Plan reader uses.
      await page.waitForSelector('.reader__h2 .hash');
      expect(await page.locator('.reader__h2 .hash').first().textContent()).toContain('##');

      // (b) The mermaid fence renders an actual SVG (await the async render),
      //     not an inert source-only affordance like the Plan reader.
      await page.waitForSelector('.mermaid-host svg', { timeout: 15_000 });
      expect(await page.locator('.mermaid-host svg').count()).toBeGreaterThan(0);

      // (c) The Chrome tab strip is present with an Implementation Notes tab.
      await page.waitForSelector('.chrome__tabs');
      const notesTab = page.locator('.chrome__tabs .tab', { hasText: 'Implementation Notes' });
      expect(await notesTab.count()).toBe(1);

      // The main (Task) tab body omits the Implementation Notes heading text...
      const taskBody = (await page.locator('.reader').textContent()) ?? '';
      expect(taskBody).toContain('Objective');
      expect(taskBody).not.toContain('Implementation Notes');
      expect(taskBody).not.toContain('noteworthy event documented');

      // ...and selecting the Implementation Notes tab reveals that content. The
      // tab drops the redundant `## Implementation Notes` heading (the tab label
      // names it) and unwraps the root `<details>` — so neither the heading nor
      // the `<summary>` label survive, only the inner guidance.
      await notesTab.click();
      await page.waitForSelector('.reader');
      const notesBody = (await page.locator('.reader').textContent()) ?? '';
      expect(notesBody).toContain('noteworthy event documented');
      expect(notesBody).not.toContain('Implementation Notes');
      expect(notesBody).not.toContain('Detailed implementation guidance');
      // The disclosure is unwrapped: no <details> element remains in the tab.
      expect(await page.locator('.reader details').count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test('no-notes task shows no Implementation Notes tab', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/plans/901/tasks/2`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.reader');
      await page.waitForSelector('.reader__h2 .hash');

      // The narrative renders, but there is no Implementation Notes tab.
      const body = (await page.locator('.reader').textContent()) ?? '';
      expect(body).toContain('Objective');
      const notesTab = page.locator('.chrome__tabs .tab', { hasText: 'Implementation Notes' });
      expect(await notesTab.count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test('no-`##` task renders its prose without duplicating the title as a body h1', async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/plans/901/tasks/4`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.reader');

      // The page heading shows the title once.
      expect(await page.locator('h1.chrome__title').textContent()).toContain(
        'Configure the deployment pipeline'
      );
      // The prose renders in the body...
      const body = (await page.locator('.reader').textContent()) ?? '';
      expect(body).toContain('Some plain prose with no level-two headings');
      // ...but the title is NOT re-emitted as a second <h1> inside the body.
      expect(await page.locator('.reader h1').count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test('empty-body task renders the graceful empty state', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    try {
      await page.goto(`${handle.url}/plans/901/tasks/3`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.reader');

      const body = (await page.locator('.reader').textContent()) ?? '';
      expect(body).toContain('This task has no description.');
      // No section heading and no notes tab for an empty task.
      expect(await page.locator('.reader__h2').count()).toBe(0);
      expect(
        await page.locator('.chrome__tabs .tab', { hasText: 'Implementation Notes' }).count()
      ).toBe(0);
    } finally {
      await page.close();
    }
  });
});
