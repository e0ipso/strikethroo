/**
 * Integration tests for the centralized skill-scripts TypeScript source
 * and the bundled .cjs artifacts under templates/harness/skills/.
 *
 * Covers:
 *   1. Plan ID allocation across plans/ and archive/.
 *   2. Strikethroo root discovery from a nested working directory.
 *   3. Bundle smoke check: generated .cjs files execute self-contained
 *      from a fixture that contains only the skill.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { findStrikethrooRoot } from '../skill-scripts/shared/root';
import { getAllPlans, computeNextPlanId } from '../skill-scripts/shared/plan-scan';
import { hasExecutionBlueprint } from '../skill-scripts/shared/blueprint-detection';
import { parseComplexityScore } from '../skill-scripts/shared/complexity-score';
import { countTaskFiles } from '../skill-scripts/shared/task-count';
import { validateTaskComplexityScores } from '../skill-scripts/shared/task-complexity';
import { _sanitizeBranchName, _extractPlanName } from '../skill-scripts/create-feature-branch';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = path.join(REPO_ROOT, 'templates', 'harness', 'skills', 'st-create-plan');

const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const buildMixedFixture = (root: string): void => {
  const tm = path.join(root, '.ai', 'strikethroo');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
  );

  writeFile(
    path.join(tm, 'plans', '03--alpha', 'plan-03--alpha.md'),
    '---\nid: 3\nsummary: "alpha"\ncreated: 2026-01-01\n---\nbody\n'
  );
  writeFile(
    path.join(tm, 'plans', '07--beta', 'plan-07--beta.md'),
    '---\nid: 7\nsummary: "beta"\ncreated: 2026-01-02\n---\nbody\n'
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

  test('getAllPlans recognizes .md across plans/ and archive/', () => {
    const root = path.join(tempDir, '.ai', 'strikethroo');
    const plans = getAllPlans(root);
    const ids = plans.map(p => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([2, 3, 7]);

    const archiveIds = plans
      .filter(p => p.isArchive)
      .map(p => p.id)
      .sort((a, b) => a - b);
    expect(archiveIds).toEqual([2]);
  });

  test('computeNextPlanId returns max + 1', () => {
    const root = path.join(tempDir, '.ai', 'strikethroo');
    expect(computeNextPlanId(root)).toBe(8);
  });

  test('computeNextPlanId returns 1 for an empty workspace', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-empty-'));
    try {
      const tm = path.join(fresh, '.ai', 'strikethroo');
      fs.mkdirSync(tm, { recursive: true });
      fs.writeFileSync(
        path.join(tm, '.init-metadata.json'),
        JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
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

  test('finds the strikethroo root from a nested working directory', () => {
    const nested = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha');
    const found = findStrikethrooRoot(nested);
    expect(found).not.toBeNull();
    expect(path.resolve(found as string)).toBe(
      path.resolve(path.join(tempDir, '.ai', 'strikethroo'))
    );
  });

  test('returns null when no strikethroo root exists', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-noroot-'));
    try {
      expect(findStrikethrooRoot(empty)).toBeNull();
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('skill-scripts validation helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validation-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('countTaskFiles counts only markdown task files', () => {
    const planDir = path.join(tempDir, 'plans', '03--alpha');
    const tasksDir = path.join(planDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, '01--one.md'), '# One\n');
    fs.writeFileSync(path.join(tasksDir, '02--two.md'), '# Two\n');
    fs.writeFileSync(path.join(tasksDir, 'notes.txt'), 'ignore\n');

    expect(countTaskFiles(planDir)).toBe(2);
  });

  test('countTaskFiles returns zero for absent or non-directory task folders', () => {
    const absentPlanDir = path.join(tempDir, 'absent');
    expect(countTaskFiles(absentPlanDir)).toBe(0);

    const filePlanDir = path.join(tempDir, 'file-plan');
    fs.mkdirSync(filePlanDir, { recursive: true });
    fs.writeFileSync(path.join(filePlanDir, 'tasks'), 'not a directory\n');
    expect(countTaskFiles(filePlanDir)).toBe(0);
  });

  test('hasExecutionBlueprint detects the execution blueprint heading', () => {
    const withBlueprint = path.join(tempDir, 'with.md');
    const withoutBlueprint = path.join(tempDir, 'without.md');
    fs.writeFileSync(withBlueprint, '# Plan\n\n## Execution Blueprint\n\nBody.\n');
    fs.writeFileSync(withoutBlueprint, '# Plan\n\n## Similar Heading\n\nBody.\n');

    expect(hasExecutionBlueprint(withBlueprint)).toBe(true);
    expect(hasExecutionBlueprint(withoutBlueprint)).toBe(false);
    expect(hasExecutionBlueprint(path.join(tempDir, 'missing.md'))).toBe(false);
  });

  test('parseComplexityScore accepts only unsigned integers from 1 through 10', () => {
    expect(parseComplexityScore('1')).toBe(1);
    expect(parseComplexityScore('10')).toBe(10);
    expect(parseComplexityScore('0')).toBeUndefined();
    expect(parseComplexityScore('11')).toBeUndefined();
    expect(parseComplexityScore('5.5')).toBeUndefined();
    expect(parseComplexityScore('-1')).toBeUndefined();
    expect(parseComplexityScore('high')).toBeUndefined();
    expect(parseComplexityScore('"7"')).toBeUndefined();
  });

  test('validateTaskComplexityScores reports task complexity failures', () => {
    const planDir = path.join(tempDir, 'plans', '03--alpha');
    const tasksDir = path.join(planDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    const writeTask = (name: string, scoreLine: string): void => {
      fs.writeFileSync(
        path.join(tasksDir, name),
        `---\nid: 1\ngroup: "g"\ndependencies: []\nstatus: "pending"\n${scoreLine}\nskills:\n  - typescript\n---\n# Task\n`
      );
    };

    writeTask('01--lower.md', 'complexity_score: 1');
    writeTask('02--upper.md', 'complexity_score: 10 # valid comment');
    writeTask('03--missing.md', 'summary: "no score"');
    writeTask('04--decimal.md', 'complexity_score: 5.5');
    writeTask('05--quoted.md', 'complexity_score: "7"');
    writeTask('06--above.md', 'complexity_score: 11');

    expect(validateTaskComplexityScores(planDir)).toEqual([
      '03--missing.md: missing complexity_score',
      '04--decimal.md: non-integer complexity_score "5.5"',
      '05--quoted.md: non-integer complexity_score ""7""',
      '06--above.md: complexity_score 11 out of range 1-10',
    ]);
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
    fixtureSkillDir = path.join(tempDir, 'st-create-plan');
    fs.cpSync(SKILL_DIR, fixtureSkillDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-strikethroo-root.cjs resolves the fixture root', () => {
    const scriptPath = path.join(fixtureSkillDir, 'scripts', 'find-strikethroo-root.cjs');
    const cwd = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha');
    const stdout = execFileSync('node', [scriptPath], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(path.join(tempDir, '.ai', 'strikethroo')));
  });

  test('get-next-plan-id.cjs bundled script produces correct output', () => {
    const bundledScript = path.join(fixtureSkillDir, 'scripts', 'get-next-plan-id.cjs');

    const bundledOut = execFileSync('node', [bundledScript], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();

    expect(parseInt(bundledOut, 10)).toBe(8);
  });
});

describe('create-feature-branch helpers', () => {
  test('_sanitizeBranchName lowercases and sanitizes', () => {
    expect(_sanitizeBranchName('Hello World!!!')).toBe('hello-world');
    expect(_sanitizeBranchName('---test---')).toBe('test');
    expect(_sanitizeBranchName('a'.repeat(70))).toBe('a'.repeat(60));
  });

  test('_extractPlanName extracts name from id--name pattern', () => {
    expect(_extractPlanName('/some/path/70--st-execute-blueprint-skill')).toBe(
      'st-execute-blueprint-skill'
    );
    expect(_extractPlanName('/some/path/unknown')).toBe('unknown');
  });
});

describe('create-feature-branch integration', () => {
  let tempDir: string;

  const buildGitFixture = (root: string, planName: string, planId: number): string => {
    const tm = path.join(root, '.ai', 'strikethroo');
    fs.mkdirSync(tm, { recursive: true });
    fs.writeFileSync(
      path.join(tm, '.init-metadata.json'),
      JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
    );
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

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-branch-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('creates feature branch from clean main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    const bundledScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'create-feature-branch.cjs'
    );
    const result = execFileSync('node', [bundledScript, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(result).toContain('Created and switched to branch: feature/42--my-test-plan');
    const branches = execFileSync('git', ['branch', '--list'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(branches).toContain('feature/42--my-test-plan');
  });

  test('skips branch creation when not on main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    execFileSync('git', ['checkout', '-b', 'other-branch'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    const bundledScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'create-feature-branch.cjs'
    );
    const result = execFileSync('node', [bundledScript, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(result).toContain('Not on main/master branch');
    expect(result).toContain('Proceeding without creating a new branch');
  });

  test('creates a feature branch when changes are confined to .ai/strikethroo', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    writeFile(
      path.join(tempDir, '.ai', 'strikethroo', 'plans', '42--my-test-plan', 'tasks', '01--task.md'),
      'generated task'
    );
    const bundledScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'create-feature-branch.cjs'
    );
    const result = execFileSync('node', [bundledScript, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(result).toContain('Created and switched to branch: feature/42--my-test-plan');
  });

  test('errors when uncommitted changes outside .ai/strikethroo exist on main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    fs.writeFileSync(path.join(tempDir, 'dirty.txt'), 'dirty');
    const bundledScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'create-feature-branch.cjs'
    );
    let exitCode: number | null = null;
    try {
      execFileSync('node', [bundledScript, planFile], {
        cwd: tempDir,
        encoding: 'utf8',
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
    }
    expect(exitCode).toBe(1);
  });

  test('checks out existing branch when on main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    execFileSync('git', ['checkout', '-b', 'feature/42--my-test-plan'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['checkout', 'main'], { cwd: tempDir, stdio: 'pipe' });
    const bundledScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'create-feature-branch.cjs'
    );
    const result = execFileSync('node', [bundledScript, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(result).toContain('already exists');
    expect(result).toContain('Switched to existing branch: feature/42--my-test-plan');
    const currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(currentBranch).toBe('feature/42--my-test-plan');
  });
});

describe('st-execute-blueprint bundle smoke check', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-exec-'));
    const tm = path.join(tempDir, '.ai', 'strikethroo');
    fs.mkdirSync(tm, { recursive: true });
    fs.writeFileSync(
      path.join(tm, '.init-metadata.json'),
      JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
    );
    const planDir = path.join(tm, 'plans', '03--alpha');
    fs.mkdirSync(planDir, { recursive: true });
    fs.writeFileSync(
      path.join(planDir, 'plan-03--alpha.md'),
      '---\nid: 3\nsummary: "alpha"\ncreated: 2026-01-01\n---\n'
    );

    fixtureSkillDir = path.join(tempDir, 'st-execute-blueprint');
    fs.cpSync(
      path.join(REPO_ROOT, 'templates', 'harness', 'skills', 'st-execute-blueprint'),
      fixtureSkillDir,
      { recursive: true }
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-strikethroo-root.cjs resolves fixture root', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'find-strikethroo-root.cjs');
    const cwd = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha');
    const stdout = execFileSync('node', [script], { cwd, encoding: 'utf8' }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(path.join(tempDir, '.ai', 'strikethroo')));
  });

  test('validate-plan-blueprint.cjs returns plan file path', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'validate-plan-blueprint.cjs');
    const cwd = tempDir;
    const stdout = execFileSync('node', [script, '3', 'planFile'], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(
      path.resolve(
        path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha', 'plan-03--alpha.md')
      )
    );
  });

  test('validate-plan-blueprint.cjs reports complexity_score validity', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'validate-plan-blueprint.cjs');
    const tasksDir = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha', 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    const writeTask = (name: string, scoreLine: string): void => {
      fs.writeFileSync(
        path.join(tasksDir, name),
        `---\nid: 1\ngroup: "g"\ndependencies: []\nstatus: "pending"\n${scoreLine}\nskills:\n  - typescript\n---\n# Task\n`
      );
    };

    // All valid (boundaries 1 and 10 accepted).
    writeTask('01--lower.md', 'complexity_score: 1');
    writeTask('02--upper.md', 'complexity_score: 10');
    expect(
      execFileSync('node', [script, '3', 'complexityScoresValid'], {
        cwd: tempDir,
        encoding: 'utf8',
      }).trim()
    ).toBe('yes');

    // Introduce out-of-range, non-integer, and missing offenders.
    writeTask('03--zero.md', 'complexity_score: 0');
    writeTask('04--decimal.md', 'complexity_score: 5.5');
    fs.writeFileSync(
      path.join(tasksDir, '05--missing.md'),
      '---\nid: 5\ngroup: "g"\ndependencies: []\nstatus: "pending"\nskills:\n  - typescript\n---\n# Task\n'
    );

    expect(
      execFileSync('node', [script, '3', 'complexityScoresValid'], {
        cwd: tempDir,
        encoding: 'utf8',
      }).trim()
    ).toBe('no');

    const invalid = execFileSync('node', [script, '3', 'invalidComplexityTasks'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();
    expect(invalid).toContain('03--zero.md');
    expect(invalid).toContain('04--decimal.md');
    expect(invalid).toContain('05--missing.md');
    expect(invalid).not.toContain('01--lower.md');
  });

  test('create-feature-branch.cjs creates expected branch', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'create-feature-branch.cjs');
    const planFile = path.join(
      tempDir,
      '.ai',
      'strikethroo',
      'plans',
      '03--alpha',
      'plan-03--alpha.md'
    );
    execFileSync('git', ['init', '-b', 'main'], { cwd: tempDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@test.com'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['config', 'user.name', 'Test'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    fs.writeFileSync(path.join(tempDir, 'init.txt'), 'init');
    execFileSync('git', ['add', '.'], { cwd: tempDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: tempDir, stdio: 'pipe' });

    const stdout = execFileSync('node', [script, planFile], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(stdout).toContain('feature/3--alpha');
    const branches = execFileSync('git', ['branch', '--list'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    expect(branches).toContain('feature/3--alpha');
  });
});

describe('st-refine-plan bundle smoke check', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-refine-'));
    const tm = path.join(tempDir, '.ai', 'strikethroo');
    fs.mkdirSync(tm, { recursive: true });
    fs.writeFileSync(
      path.join(tm, '.init-metadata.json'),
      JSON.stringify({ version: '1.0.0', workspaceSchemaVersion: 4 })
    );
    const planDir = path.join(tm, 'plans', '03--alpha');
    fs.mkdirSync(planDir, { recursive: true });
    fs.writeFileSync(
      path.join(planDir, 'plan-03--alpha.md'),
      '---\nid: 3\nsummary: "alpha"\ncreated: 2026-01-01\n---\n'
    );

    fixtureSkillDir = path.join(tempDir, 'st-refine-plan');
    fs.cpSync(
      path.join(REPO_ROOT, 'templates', 'harness', 'skills', 'st-refine-plan'),
      fixtureSkillDir,
      { recursive: true }
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-strikethroo-root.cjs resolves the fixture root', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'find-strikethroo-root.cjs');
    const cwd = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha');
    const stdout = execFileSync('node', [script], { cwd, encoding: 'utf8' }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(path.join(tempDir, '.ai', 'strikethroo')));
  });

  test('validate-plan-blueprint.cjs returns plan file path', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'validate-plan-blueprint.cjs');
    const cwd = tempDir;
    const stdout = execFileSync('node', [script, '3', 'planFile'], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(
      path.resolve(
        path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha', 'plan-03--alpha.md')
      )
    );
  });
});

const buildTaskFixture = (
  root: string,
  planId: number,
  planName: string,
  tasks: Array<{ id: number; status: string; dependencies: number[] }>
): void => {
  const tm = path.join(root, '.ai', 'strikethroo');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
  );
  const paddedPlanId = String(planId).padStart(2, '0');
  const planDir = path.join(tm, 'plans', `${paddedPlanId}--${planName}`);
  fs.mkdirSync(planDir, { recursive: true });
  fs.writeFileSync(
    path.join(planDir, `plan-${paddedPlanId}--${planName}.md`),
    `---\nid: ${planId}\nsummary: "${planName}"\ncreated: 2026-01-01\n---\n`
  );
  const tasksDir = path.join(planDir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  for (const task of tasks) {
    const depsStr =
      task.dependencies.length > 0
        ? `dependencies: [${task.dependencies.join(', ')}]`
        : 'dependencies: []';
    fs.writeFileSync(
      path.join(tasksDir, `${String(task.id).padStart(2, '0')}--task-${task.id}.md`),
      `---\nid: ${task.id}\nstatus: "${task.status}"\n${depsStr}\n---\n# Task ${task.id}\n`
    );
  }
};

const buildPhaseBlueprintFixture = (
  root: string,
  planId: number,
  planName: string,
  tasks: Array<{ id: number; status: string; dependencies: number[] }>,
  blueprintPhases: number[][]
): void => {
  buildTaskFixture(root, planId, planName, tasks);
  const paddedPlanId = String(planId).padStart(2, '0');
  const planFile = path.join(
    root,
    '.ai',
    'strikethroo',
    'plans',
    `${paddedPlanId}--${planName}`,
    `plan-${paddedPlanId}--${planName}.md`
  );
  const phaseSections = blueprintPhases
    .map((taskIds, index) => {
      const lines = taskIds.map(id => `- Task ${String(id).padStart(2, '0')}`).join('\n');
      return `### Phase ${index + 1}: Test\n${lines}`;
    })
    .join('\n\n');
  fs.appendFileSync(planFile, `\n## Execution Blueprint\n\n${phaseSections}\n`);
};

describe('check-phase-readiness scenarios', () => {
  let tempDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-phase-readiness-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('reports phase ready when dependencies are completed', () => {
    buildPhaseBlueprintFixture(
      tempDir,
      4,
      'phase-ready',
      [
        { id: 1, status: 'completed', dependencies: [] },
        { id: 2, status: 'pending', dependencies: [1] },
      ],
      [[1, 2]]
    );
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'check-phase-readiness.cjs'
    );
    const result = execFileSync('node', [script, '4', '1'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(result).toContain('Phase 1 is ready to execute');
  });

  test('fails when a phase task has unresolved dependencies', () => {
    buildPhaseBlueprintFixture(
      tempDir,
      5,
      'phase-blocked',
      [
        { id: 1, status: 'pending', dependencies: [] },
        { id: 2, status: 'pending', dependencies: [1] },
      ],
      [[2]]
    );
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'check-phase-readiness.cjs'
    );
    let exitCode: number | null = null;
    let output = '';
    try {
      output = execFileSync('node', [script, '5', '1'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
      output = (e.stdout || '') + (e.stderr || '');
    }
    expect(exitCode).toBe(1);
    expect(output).toContain('not ready');
    expect(output).toContain('dependency 1 status is pending');
  });

  test('fails when a phase task needs clarification', () => {
    buildPhaseBlueprintFixture(
      tempDir,
      6,
      'phase-clarify',
      [{ id: 1, status: 'needs-clarification', dependencies: [] }],
      [[1]]
    );
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-blueprint',
      'scripts',
      'check-phase-readiness.cjs'
    );
    let exitCode: number | null = null;
    let output = '';
    try {
      output = execFileSync('node', [script, '6', '1'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
      output = (e.stdout || '') + (e.stderr || '');
    }
    expect(exitCode).toBe(1);
    expect(output).toContain('needs-clarification');
  });
});

describe('st-execute-task bundle smoke check', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-exec-task-'));
    buildTaskFixture(tempDir, 3, 'alpha', [
      { id: 1, status: 'completed', dependencies: [] },
      { id: 2, status: 'pending', dependencies: [1] },
    ]);

    fixtureSkillDir = path.join(tempDir, 'st-execute-task');
    fs.cpSync(
      path.join(REPO_ROOT, 'templates', 'harness', 'skills', 'st-execute-task'),
      fixtureSkillDir,
      { recursive: true }
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-strikethroo-root.cjs resolves fixture root', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'find-strikethroo-root.cjs');
    const cwd = path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha');
    const stdout = execFileSync('node', [script], { cwd, encoding: 'utf8' }).trim();
    expect(path.resolve(stdout)).toBe(path.resolve(path.join(tempDir, '.ai', 'strikethroo')));
  });

  test('validate-plan-blueprint.cjs returns plan file path', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'validate-plan-blueprint.cjs');
    const cwd = tempDir;
    const stdout = execFileSync('node', [script, '3', 'planFile'], {
      cwd,
      encoding: 'utf8',
    }).trim();
    expect(path.resolve(stdout)).toBe(
      path.resolve(
        path.join(tempDir, '.ai', 'strikethroo', 'plans', '03--alpha', 'plan-03--alpha.md')
      )
    );
  });

  test('check-task-dependencies.cjs reports resolved deps', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'check-task-dependencies.cjs');
    const cwd = tempDir;
    const result = execFileSync('node', [script, '3', '2'], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(result).toContain('All dependencies are resolved');
  });

  test('check-task-dependencies.cjs reports unresolved deps', () => {
    const script = path.join(fixtureSkillDir, 'scripts', 'check-task-dependencies.cjs');
    const depFile = path.join(
      tempDir,
      '.ai',
      'strikethroo',
      'plans',
      '03--alpha',
      'tasks',
      '01--task-1.md'
    );
    const original = fs.readFileSync(depFile, 'utf8');
    fs.writeFileSync(depFile, original.replace('status: "completed"', 'status: "failed"'));
    try {
      const cwd = tempDir;
      let exitCode: number | null = null;
      let output = '';
      try {
        output = execFileSync('node', [script, '3', '2'], {
          cwd,
          encoding: 'utf8',
          env: { ...process.env, NO_COLOR: '1' },
        });
      } catch (e: any) {
        exitCode = e.status ?? null;
        output = (e.stdout || '') + (e.stderr || '');
      }
      expect(exitCode).toBe(1);
      expect(output).toContain('unresolved');
    } finally {
      fs.writeFileSync(depFile, original);
    }
  });
});

describe('check-task-dependencies scenarios', () => {
  let tempDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-deps-scenario-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('no dependencies', () => {
    buildTaskFixture(tempDir, 1, 'no-deps', [{ id: 1, status: 'pending', dependencies: [] }]);
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    const result = execFileSync('node', [script, '1', '1'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(result).toContain('no dependencies');
  });

  test('all completed', () => {
    buildTaskFixture(tempDir, 2, 'all-completed', [
      { id: 1, status: 'completed', dependencies: [] },
      { id: 2, status: 'pending', dependencies: [1] },
    ]);
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    const result = execFileSync('node', [script, '2', '2'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(result).toContain('All dependencies are resolved');
  });

  test('one failed', () => {
    buildTaskFixture(tempDir, 3, 'one-failed', [
      { id: 1, status: 'failed', dependencies: [] },
      { id: 2, status: 'pending', dependencies: [1] },
    ]);
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    let exitCode: number | null = null;
    let stdout = '';
    try {
      stdout = execFileSync('node', [script, '3', '2'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
      stdout = e.stdout || '';
    }
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Task 1 - Status: failed');
    expect(stdout).toContain('failed');
  });

  test('one in-progress', () => {
    buildTaskFixture(tempDir, 4, 'one-in-progress', [
      { id: 1, status: 'in-progress', dependencies: [] },
      { id: 2, status: 'pending', dependencies: [1] },
    ]);
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    let exitCode: number | null = null;
    let stdout = '';
    try {
      stdout = execFileSync('node', [script, '4', '2'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
      stdout = e.stdout || '';
    }
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Task 1 - Status: in-progress');
    expect(stdout).toContain('in-progress');
  });

  test('task not found', () => {
    buildTaskFixture(tempDir, 5, 'task-not-found', [
      { id: 1, status: 'completed', dependencies: [] },
    ]);
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    let exitCode: number | null = null;
    try {
      execFileSync('node', [script, '5', '99'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
    }
    expect(exitCode).toBe(1);
  });

  test('plan not found', () => {
    const script = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-execute-task',
      'scripts',
      'check-task-dependencies.cjs'
    );
    let exitCode: number | null = null;
    try {
      execFileSync('node', [script, '999', '1'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (e: any) {
      exitCode = e.status ?? null;
    }
    expect(exitCode).toBe(1);
  });
});
