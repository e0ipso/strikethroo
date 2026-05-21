/**
 * Integration tests for the task-full-workflow skill bundles.
 * Covers the five generated .cjs scripts with fixture-based smoke tests
 * and cross-validates against legacy reference scripts where applicable.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = path.join(
  REPO_ROOT,
  'templates',
  'assistant',
  'skills',
  'task-full-workflow'
);
const REFERENCE_NEXT_PLAN_ID_CJS = path.join(
  REPO_ROOT,
  'templates',
  'ai-task-manager',
  'config',
  'scripts',
  'get-next-plan-id.cjs'
);
const REFERENCE_NEXT_TASK_ID_CJS = path.join(
  REPO_ROOT,
  'templates',
  'ai-task-manager',
  'config',
  'scripts',
  'get-next-task-id.cjs'
);
const REFERENCE_VALIDATE_BLUEPRINT_CJS = path.join(
  REPO_ROOT,
  'templates',
  'ai-task-manager',
  'config',
  'scripts',
  'validate-plan-blueprint.cjs'
);
const REFERENCE_CREATE_FEATURE_BRANCH_CJS = path.join(
  REPO_ROOT,
  'templates',
  'ai-task-manager',
  'config',
  'scripts',
  'create-feature-branch.cjs'
);

const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const buildFixtureRoot = (root: string): string => {
  const tm = path.join(root, '.ai', 'task-manager');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test' })
  );
  return tm;
};

const buildGitFixture = (
  root: string,
  planName: string,
  planId: number
): string => {
  const tm = buildFixtureRoot(root);
  const planDir = path.join(tm, 'plans', `${planId}--${planName}`);
  fs.mkdirSync(planDir, { recursive: true });
  const planFile = path.join(planDir, `plan-${planId}--${planName}.md`);
  fs.writeFileSync(
    planFile,
    `---\nid: ${planId}\nsummary: "${planName}"\ncreated: 2026-01-01\n---\n`
  );
  execFileSync('git', ['init', '-b', 'main'], {
    cwd: root,
    stdio: 'pipe',
  });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], {
    cwd: root,
    stdio: 'pipe',
  });
  execFileSync('git', ['config', 'user.name', 'Test'], {
    cwd: root,
    stdio: 'pipe',
  });
  fs.writeFileSync(path.join(root, 'init.txt'), 'init');
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: root, stdio: 'pipe' });
  return planFile;
};

const buildPlanWithTasks = (
  root: string,
  planId: number,
  planName: string,
  taskIds: number[]
): string => {
  const tm = buildFixtureRoot(root);
  const planDir = path.join(tm, 'plans', `${planId}--${planName}`);
  fs.mkdirSync(planDir, { recursive: true });
  const planFile = path.join(planDir, `plan-${planId}--${planName}.md`);
  fs.writeFileSync(
    planFile,
    `---\nid: ${planId}\nsummary: "${planName}"\ncreated: 2026-01-01\n---\n`
  );
  const tasksDir = path.join(planDir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  for (const taskId of taskIds) {
    const padded = String(taskId).padStart(2, '0');
    fs.writeFileSync(
      path.join(tasksDir, `${padded}--task-${taskId}.md`),
      `---\nid: ${taskId}\nstatus: "pending"\ndependencies: []\ncreated: 2026-01-01\n---\n`
    );
  }
  return planFile;
};

describe('task-full-workflow bundle smoke', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfw-bundle-'));
    buildFixtureRoot(tempDir);
    fixtureSkillDir = path.join(tempDir, 'task-full-workflow');
    fs.cpSync(SKILL_DIR, fixtureSkillDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-task-manager-root.cjs resolves fixture root from nested dir', () => {
    const script = path.join(
      fixtureSkillDir,
      'scripts',
      'find-task-manager-root.cjs'
    );
    const cwd = path.join(tempDir, '.ai', 'task-manager', 'plans', '01--dummy');
    fs.mkdirSync(cwd, { recursive: true });
    const stdout = execFileSync('node', [script], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(
      path.resolve(path.join(tempDir, '.ai', 'task-manager'))
    );
  });

  test('get-next-plan-id.cjs returns 1 for fresh fixture', () => {
    const script = path.join(
      fixtureSkillDir,
      'scripts',
      'get-next-plan-id.cjs'
    );
    const stdout = execFileSync('node', [script], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(stdout).toBe('1');
  });

  test('validate-plan-blueprint.cjs returns plan file path', () => {
    const tm = path.join(tempDir, '.ai', 'task-manager');
    const planDir = path.join(tm, 'plans', '05--sample');
    fs.mkdirSync(planDir, { recursive: true });
    const planFile = path.join(planDir, 'plan-05--sample.md');
    fs.writeFileSync(
      planFile,
      '---\nid: 5\nsummary: "sample"\ncreated: 2026-01-01\n---\n'
    );
    const script = path.join(
      fixtureSkillDir,
      'scripts',
      'validate-plan-blueprint.cjs'
    );
    const stdout = execFileSync('node', [script, '5', 'planFile'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(planFile));
  });

  test('get-next-task-id.cjs returns 3 for plan with tasks [1, 2]', () => {
    buildPlanWithTasks(tempDir, 7, 'sample', [1, 2]);
    const script = path.join(
      fixtureSkillDir,
      'scripts',
      'get-next-task-id.cjs'
    );
    const stdout = execFileSync('node', [script, '7'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(stdout).toBe('3');
  });

  test('create-feature-branch.cjs creates and switches to feature branch', () => {
    const planFile = buildGitFixture(tempDir, 'my-plan', 9);
    const script = path.join(
      fixtureSkillDir,
      'scripts',
      'create-feature-branch.cjs'
    );
    const stdout = execFileSync('node', [script, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(stdout).toContain('Created and switched to branch: feature/9--my-plan');
    const branches = execFileSync('git', ['branch', '--list'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(branches).toContain('feature/9--my-plan');
  });
});

describe('task-full-workflow cross-validation', () => {
  let tempDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfw-xval-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('get-next-plan-id.cjs matches legacy reference output', () => {
    buildFixtureRoot(tempDir);
    const bundledScript = path.join(SKILL_DIR, 'scripts', 'get-next-plan-id.cjs');
    const bundled = execFileSync('node', [bundledScript], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    const legacy = execFileSync('node', [REFERENCE_NEXT_PLAN_ID_CJS], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(bundled).toBe(legacy);
    expect(bundled).toBe('1');
  });

  test('validate-plan-blueprint.cjs matches legacy reference output', () => {
    const tm = buildFixtureRoot(tempDir);
    const planDir = path.join(tm, 'plans', '05--sample');
    fs.mkdirSync(planDir, { recursive: true });
    const planFile = path.join(planDir, 'plan-05--sample.md');
    fs.writeFileSync(
      planFile,
      '---\nid: 5\nsummary: "sample"\ncreated: 2026-01-01\n---\n'
    );
    const bundledScript = path.join(
      SKILL_DIR,
      'scripts',
      'validate-plan-blueprint.cjs'
    );
    const bundled = execFileSync('node', [bundledScript, '5', 'planFile'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    const legacy = execFileSync(
      'node',
      [REFERENCE_VALIDATE_BLUEPRINT_CJS, '5', 'planFile'],
      {
        cwd: tempDir,
        encoding: 'utf8',
      }
    ).trim();
    expect(bundled).toBe(legacy);
    expect(path.resolve(bundled)).toBe(path.resolve(planFile));
  });

  test('get-next-task-id.cjs matches legacy reference output', () => {
    buildPlanWithTasks(tempDir, 7, 'sample', [1, 2]);
    const bundledScript = path.join(SKILL_DIR, 'scripts', 'get-next-task-id.cjs');
    const bundled = execFileSync('node', [bundledScript, '7'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    const legacy = execFileSync('node', [REFERENCE_NEXT_TASK_ID_CJS, '7'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(bundled).toBe(legacy);
    expect(bundled).toBe('3');
  });

  test('create-feature-branch.cjs matches legacy branch naming and behavior', () => {
    const planFile = buildGitFixture(tempDir, 'cross-validation', 11);
    const bundledScript = path.join(
      SKILL_DIR,
      'scripts',
      'create-feature-branch.cjs'
    );
    const legacyScript = path.join(REFERENCE_CREATE_FEATURE_BRANCH_CJS);

    let bundledResult = '';
    let bundledError = false;
    try {
      bundledResult = execFileSync('node', [bundledScript, planFile], {
        cwd: tempDir,
        encoding: 'utf8',
      });
    } catch (e: any) {
      bundledResult = e.stdout || '';
      bundledError = true;
    }

    let legacyResult = '';
    let legacyError = false;
    try {
      legacyResult = execFileSync('node', [legacyScript, planFile], {
        cwd: tempDir,
        encoding: 'utf8',
      });
    } catch (e: any) {
      legacyResult = e.stdout || '';
      legacyError = true;
    }

    expect(bundledError).toBe(false);
    expect(legacyError).toBe(false);
    expect(bundledResult).toContain('feature/11--cross-validation');
    expect(legacyResult).toContain('feature/11--cross-validation');

    const branches = execFileSync('git', ['branch', '--list'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(branches).toContain('feature/11--cross-validation');
  });
});
