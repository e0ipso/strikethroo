/**
 * Integration tests for the st-full-workflow skill bundles.
 * Covers the generated .cjs scripts with fixture-based smoke tests.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = path.join(REPO_ROOT, 'templates', 'harness', 'skills', 'st-full-workflow');

const buildFixtureRoot = (root: string): string => {
  const tm = path.join(root, '.ai', 'strikethroo');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
  );
  return tm;
};

const buildGitFixture = (root: string, planName: string, planId: number): string => {
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

describe('st-full-workflow bundle smoke', () => {
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
    fixtureSkillDir = path.join(tempDir, 'st-full-workflow');
    fs.cpSync(SKILL_DIR, fixtureSkillDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-strikethroo-root.cjs resolves fixture root from nested dir', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'find-strikethroo-root.cjs');
    const cwd = path.join(tempDir, '.ai', 'strikethroo', 'plans', '01--dummy');
    fs.mkdirSync(cwd, { recursive: true });
    const stdout = execFileSync('node', [script], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(path.join(tempDir, '.ai', 'strikethroo')));
  });

  test('get-next-plan-id.cjs returns 1 for fresh fixture', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'get-next-plan-id.cjs');
    const stdout = execFileSync('node', [script], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(stdout).toBe('1');
  });

  test('validate-plan-blueprint.cjs returns plan file path', () => {
    const tm = path.join(tempDir, '.ai', 'strikethroo');
    const planDir = path.join(tm, 'plans', '05--sample');
    fs.mkdirSync(planDir, { recursive: true });
    const planFile = path.join(planDir, 'plan-05--sample.md');
    fs.writeFileSync(planFile, '---\nid: 5\nsummary: "sample"\ncreated: 2026-01-01\n---\n');
    const script = path.join(fixtureSkillDir, 'scripts', 'validate-plan-blueprint.cjs');
    const stdout = execFileSync('node', [script, '5', 'planFile'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(planFile));
  });

  test('get-next-task-id.cjs returns 3 for plan with tasks [1, 2]', () => {
    buildPlanWithTasks(tempDir, 7, 'sample', [1, 2]);
    const script = path.join(fixtureSkillDir, 'scripts', 'get-next-task-id.cjs');
    const stdout = execFileSync('node', [script, '7'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    }).trim();
    expect(stdout).toBe('3');
  });

  test('ships the task execution dispatcher referenced by the skill', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'dispatch-task-execution.cjs');
    expect(fs.statSync(script).isFile()).toBe(true);
  });

  test('create-feature-branch.cjs creates and switches to feature branch', () => {
    const planFile = buildGitFixture(tempDir, 'my-plan', 9);
    const script = path.join(fixtureSkillDir, 'scripts', 'create-feature-branch.cjs');
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
