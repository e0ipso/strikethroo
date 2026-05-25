/**
 * Integration tests for the task-generate-tasks skill:
 *   1. Direct TypeScript helper tests (resolvePlan, computeNextTaskId).
 *   2. Bundle smoke checks of the three .cjs files shipped with the skill.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { resolvePlan } from '../skill-scripts/shared/plan-resolve';
import { computeNextTaskId } from '../skill-scripts/shared/task-scan';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = path.join(
  REPO_ROOT,
  'templates',
  'harness',
  'skills',
  'task-generate-tasks'
);
const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const planFrontmatter = (id: number): string =>
  `---\nid: ${id}\nsummary: "fx"\ncreated: 2026-05-14\n---\nbody\n`;

const taskFrontmatter = (id: number): string =>
  `---\nid: ${id}\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncreated: 2026-05-14\nskills:\n  - typescript\n---\nbody\n`;

const buildFixtureRoot = (root: string): string => {
  const tm = path.join(root, '.ai', 'task-manager');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test' })
  );
  return tm;
};

const buildPlanWithTasks = (
  tm: string,
  planId: number,
  isArchive: boolean,
  taskIds: number[] = []
): { planDir: string; planFile: string } => {
  const padded = String(planId).padStart(2, '0');
  const planDirName = `${padded}--fixture`;
  const parentName = isArchive ? 'archive' : 'plans';
  const planDir = path.join(tm, parentName, planDirName);
  const planFile = path.join(planDir, `plan-${padded}--fixture.md`);
  writeFile(planFile, planFrontmatter(planId));
  taskIds.forEach(tid => {
    const tpad = String(tid).padStart(2, '0');
    writeFile(
      path.join(planDir, 'tasks', `${tpad}--task.md`),
      taskFrontmatter(tid)
    );
  });
  return { planDir, planFile };
};

describe('task-generate-tasks helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgt-helpers-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('computeNextTaskId returns 1 when tasks/ is missing', () => {
    const tm = buildFixtureRoot(tempDir);
    const { planDir } = buildPlanWithTasks(tm, 5, false, []);
    expect(computeNextTaskId(planDir)).toBe(1);
  });

  test('computeNextTaskId returns 1 when tasks/ is empty', () => {
    const tm = buildFixtureRoot(tempDir);
    const { planDir } = buildPlanWithTasks(tm, 5, false, []);
    fs.mkdirSync(path.join(planDir, 'tasks'), { recursive: true });
    expect(computeNextTaskId(planDir)).toBe(1);
  });

  test('computeNextTaskId returns max(id)+1 from frontmatter', () => {
    const tm = buildFixtureRoot(tempDir);
    const { planDir } = buildPlanWithTasks(tm, 5, false, [1, 2, 4]);
    expect(computeNextTaskId(planDir)).toBe(5);
  });

  test('resolvePlan resolves a numeric ID from an inner working directory', () => {
    const tm = buildFixtureRoot(tempDir);
    buildPlanWithTasks(tm, 7, false, []);
    const inner = path.join(tm, 'plans', '07--fixture');
    const resolved = resolvePlan(7, inner);
    expect(resolved).not.toBeNull();
    expect(resolved!.planId).toBe(7);
    expect(path.resolve(resolved!.taskManagerRoot)).toBe(path.resolve(tm));
  });

  test('resolvePlan resolves an archived plan by ID', () => {
    const tm = buildFixtureRoot(tempDir);
    buildPlanWithTasks(tm, 9, true, []);
    const resolved = resolvePlan(9, tempDir);
    expect(resolved).not.toBeNull();
    expect(resolved!.planId).toBe(9);
    expect(resolved!.planDir).toContain(path.join('archive', '09--fixture'));
  });

  test('resolvePlan resolves an absolute path', () => {
    const tm = buildFixtureRoot(tempDir);
    const { planFile } = buildPlanWithTasks(tm, 11, false, []);
    const resolved = resolvePlan(planFile);
    expect(resolved).not.toBeNull();
    expect(resolved!.planId).toBe(11);
    expect(resolved!.planFile).toBe(planFile);
  });

  test('resolvePlan returns null for an unknown plan ID', () => {
    const tm = buildFixtureRoot(tempDir);
    buildPlanWithTasks(tm, 3, false, []);
    expect(resolvePlan(99, tempDir)).toBeNull();
  });
});

describe('task-generate-tasks bundle smoke', () => {
  let tempDir: string;
  let fixtureSkillDir: string;
  let tm: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgt-bundle-'));
    tm = buildFixtureRoot(tempDir);
    buildPlanWithTasks(tm, 12, false, [1, 2, 3]);

    fixtureSkillDir = path.join(tempDir, 'task-generate-tasks');
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
    const inner = path.join(tm, 'plans', '12--fixture');
    const stdout = execFileSync('node', [scriptPath], {
      cwd: inner,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(tm));
  });

  test('validate-plan-blueprint.cjs returns planFile for a fixture plan', () => {
    const scriptPath = path.join(
      fixtureSkillDir,
      'scripts',
      'validate-plan-blueprint.cjs'
    );
    const stdout = execFileSync('node', [scriptPath, '12', 'planFile'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    const expected = path.join(tm, 'plans', '12--fixture', 'plan-12--fixture.md');
    expect(path.resolve(stdout)).toBe(path.resolve(expected));
  });

  test('validate-plan-blueprint.cjs reports taskCount and blueprintExists', () => {
    const scriptPath = path.join(
      fixtureSkillDir,
      'scripts',
      'validate-plan-blueprint.cjs'
    );
    const countOut = execFileSync('node', [scriptPath, '12', 'taskCount'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(parseInt(countOut, 10)).toBe(3);

    const blueprintOut = execFileSync(
      'node',
      [scriptPath, '12', 'blueprintExists'],
      { cwd: tempDir, encoding: 'utf8' }
    ).trim();
    expect(blueprintOut).toBe('no');
  });

  test('get-next-task-id.cjs bundled script produces correct output', () => {
    const bundledScript = path.join(
      fixtureSkillDir,
      'scripts',
      'get-next-task-id.cjs'
    );
    const bundled = execFileSync('node', [bundledScript, '12'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(bundled).toBe('4');
  });
});
