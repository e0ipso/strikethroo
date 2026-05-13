/**
 * Integration tests for the centralized skill-scripts TypeScript source
 * and the bundled .cjs artifacts under templates/skills/task-create-plan/.
 *
 * Covers:
 *   1. Plan ID allocation across plans/ and archive/, mixing .md and .html.
 *   2. Task-manager root discovery from a nested working directory.
 *   3. Bundle smoke check: generated .cjs files execute self-contained
 *      from a fixture that contains only the skill, and their output
 *      matches the reference .cjs in templates/ai-task-manager/.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { findTaskManagerRoot } from '../skill-scripts/shared/root';
import {
  getAllPlans,
  computeNextPlanId,
} from '../skill-scripts/shared/plan-scan';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = path.join(
  REPO_ROOT,
  'templates',
  'skills',
  'task-create-plan'
);
const REFERENCE_CJS = path.join(
  REPO_ROOT,
  'templates',
  'ai-task-manager',
  'config',
  'scripts',
  'get-next-plan-id.cjs'
);

const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const buildMixedFixture = (root: string): void => {
  const tm = path.join(root, '.ai', 'task-manager');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test' })
  );

  writeFile(
    path.join(tm, 'plans', '03--alpha', 'plan-03--alpha.md'),
    '---\nid: 3\nsummary: "alpha"\ncreated: 2026-01-01\n---\nbody\n'
  );
  writeFile(
    path.join(tm, 'plans', '07--beta', 'plan-07--beta.html'),
    '<!doctype html><html><head>' +
      '<meta name="id" content="7">' +
      '<meta name="summary" content="beta">' +
      '<meta name="created" content="2026-01-02">' +
      '</head><body></body></html>'
  );
  writeFile(
    path.join(tm, 'archive', '02--gamma', 'plan-02--gamma.md'),
    '---\nid: 2\nsummary: "gamma"\ncreated: 2026-01-03\n---\nbody\n'
  );
};

describe('skill-scripts plan ID allocation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-scripts-'));
    buildMixedFixture(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('getAllPlans recognizes .md and .html across plans/ and archive/', () => {
    const root = path.join(tempDir, '.ai', 'task-manager');
    const plans = getAllPlans(root);
    const ids = plans.map(p => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([2, 3, 7]);

    const archiveIds = plans
      .filter(p => p.isArchive)
      .map(p => p.id)
      .sort((a, b) => a - b);
    expect(archiveIds).toEqual([2]);
  });

  test('computeNextPlanId returns max + 1 across mixed formats', () => {
    const root = path.join(tempDir, '.ai', 'task-manager');
    expect(computeNextPlanId(root)).toBe(8);
  });

  test('computeNextPlanId returns 1 for an empty workspace', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-empty-'));
    try {
      const tm = path.join(fresh, '.ai', 'task-manager');
      fs.mkdirSync(tm, { recursive: true });
      fs.writeFileSync(
        path.join(tm, '.init-metadata.json'),
        JSON.stringify({ version: 'test' })
      );
      expect(computeNextPlanId(tm)).toBe(1);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});

describe('skill-scripts root discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-root-'));
    buildMixedFixture(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('finds the task-manager root from a nested working directory', () => {
    const nested = path.join(
      tempDir,
      '.ai',
      'task-manager',
      'plans',
      '03--alpha'
    );
    const found = findTaskManagerRoot(nested);
    expect(found).not.toBeNull();
    expect(path.resolve(found as string)).toBe(
      path.resolve(path.join(tempDir, '.ai', 'task-manager'))
    );
  });

  test('returns null when no task-manager root exists', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-noroot-'));
    try {
      expect(findTaskManagerRoot(empty)).toBeNull();
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('skill bundle smoke check', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    // Build the bundles so .cjs files exist for this test run.
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-'));
    buildMixedFixture(tempDir);

    // Copy the skill directory (without the repo around it) so we can
    // confirm the bundles are self-contained.
    fixtureSkillDir = path.join(tempDir, 'task-create-plan');
    fs.cpSync(SKILL_DIR, fixtureSkillDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-task-manager-root.cjs resolves the fixture root', () => {
    const scriptPath = path.join(
      fixtureSkillDir,
      'scripts',
      'find-task-manager-root.cjs'
    );
    const cwd = path.join(tempDir, '.ai', 'task-manager', 'plans', '03--alpha');
    const stdout = execFileSync('node', [scriptPath], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(
      path.resolve(path.join(tempDir, '.ai', 'task-manager'))
    );
  });

  test('get-next-plan-id.cjs matches the reference .cjs output', () => {
    const bundledScript = path.join(
      fixtureSkillDir,
      'scripts',
      'get-next-plan-id.cjs'
    );
    const fixtureCwd = tempDir;

    const bundledOut = execFileSync('node', [bundledScript], {
      cwd: fixtureCwd,
      encoding: 'utf8',
    }).trim();

    const referenceOut = execFileSync('node', [REFERENCE_CJS], {
      cwd: fixtureCwd,
      encoding: 'utf8',
    }).trim();

    // The bundled script recognizes .html plans, the reference only .md.
    // Cross-validate on a markdown-only fixture so both produce identical
    // output (proving the helpers are semantically aligned for the shared
    // surface area).
    expect(parseInt(bundledOut, 10)).toBe(8);

    // Reference .cjs only counts .md plans, so it sees ids [2, 3] → next 4.
    expect(parseInt(referenceOut, 10)).toBe(4);

    // Now create a markdown-only fixture and verify exact agreement.
    const mdOnly = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-mdonly-'));
    try {
      const tm = path.join(mdOnly, '.ai', 'task-manager');
      fs.mkdirSync(tm, { recursive: true });
      fs.writeFileSync(
        path.join(tm, '.init-metadata.json'),
        JSON.stringify({ version: 'test' })
      );
      writeFile(
        path.join(tm, 'plans', '03--alpha', 'plan-03--alpha.md'),
        '---\nid: 3\nsummary: "a"\ncreated: 2026-01-01\n---\n'
      );
      writeFile(
        path.join(tm, 'archive', '02--gamma', 'plan-02--gamma.md'),
        '---\nid: 2\nsummary: "g"\ncreated: 2026-01-03\n---\n'
      );

      const bundled = execFileSync('node', [bundledScript], {
        cwd: mdOnly,
        encoding: 'utf8',
      }).trim();
      const reference = execFileSync('node', [REFERENCE_CJS], {
        cwd: mdOnly,
        encoding: 'utf8',
      }).trim();
      expect(bundled).toBe(reference);
      expect(bundled).toBe('4');
    } finally {
      fs.rmSync(mdOnly, { recursive: true, force: true });
    }
  });
});
