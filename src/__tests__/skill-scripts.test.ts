/**
 * Integration tests for the centralized skill-scripts TypeScript source
 * and the bundled .cjs artifacts under dist-test/.
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
import { execFileSync, spawnSync } from 'child_process';

import { findStrikethrooRoot } from '../skill-scripts/shared/root';
import { getAllPlans, computeNextPlanId } from '../skill-scripts/shared/plan-scan';
import { hasExecutionBlueprint } from '../skill-scripts/shared/blueprint-detection';
import { parseBlueprintPhases, type BlueprintPhase } from '../skill-scripts/shared/blueprint-parse';
import { parseComplexityScore } from '../skill-scripts/shared/complexity-score';
import { countTaskFiles } from '../skill-scripts/shared/task-count';
import { validateTaskComplexityScores } from '../skill-scripts/shared/task-complexity';
import {
  collectTaskReadinessIssues,
  readTaskMetadata,
  rewriteTaskStatus,
} from '../skill-scripts/shared/task-file';
import { _sanitizeBranchName, _extractPlanName } from '../skill-scripts/create-feature-branch';
import {
  _classifyPlanInput,
  resolvePlan,
  type PlanInput,
} from '../skill-scripts/shared/plan-resolve';
import { builtSkillDir } from './built-skills';
import {
  BLUEPRINT_SECTION,
  TRAILING_EXECUTION_SUMMARY,
} from './fixtures/blueprint-trailing-summary';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_DIR = builtSkillDir('st-create-plan');

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

  test('parseBlueprintPhases reads heading variants and bulleted task references within its section', () => {
    const phases = [
      '### Phase 1: Named',
      '- Task 1: one',
      '* Task 01: still one',
      '- Task 002: two',
      'Task 9 in prose is not a reference',
      '1. Task 8 in a numbered list is not a reference',
      '',
      '### ✅ Phase 2: Checked',
      '- Task 003: three',
      '',
      '### Phase 3 No colon',
      '- Task 4',
      '',
      '### Phase 4',
      '- Task 5',
      '',
      '### Phase 5:',
      '- Task 6',
    ].join('\n');
    const expected: BlueprintPhase[] = [
      { index: 1, name: 'Named', taskIds: [1, 2] },
      { index: 2, name: 'Checked', taskIds: [3] },
      { index: 3, name: 'No colon', taskIds: [4] },
      { index: 4, name: undefined, taskIds: [5] },
      { index: 5, name: undefined, taskIds: [6] },
    ];
    const cases: Array<{ name: string; doc: string; expected: BlueprintPhase[] | undefined }> = [
      {
        name: 'blueprint at the end of the document',
        doc: `# Plan\n\n## Execution Blueprint\n\n${phases}\n`,
        expected,
      },
      {
        name: 'blueprint followed by an execution summary that names tasks',
        doc: `# Plan\n\n## Execution Blueprint\n\n${phases}\n\n## Execution Summary\n\n- Task 7: shipped\n- Task 6: retried\n`,
        expected,
      },
      {
        name: 'blueprint followed by notes that name tasks',
        doc: `# Plan\n\n## Execution Blueprint\n\n${phases}\n\n## Notes\n\n- Task 7 is mentioned here\n`,
        expected,
      },
      {
        name: 'blueprint preceded by sections that name tasks',
        doc: `# Plan\n\n## Context\n\n- Task 7 is mentioned here\n\n## Execution Blueprint\n\n${phases}\n`,
        expected,
      },
      {
        name: 'no blueprint section',
        doc: '# Plan\n\n## Notes\n\n- Task 1\n',
        expected: undefined,
      },
      {
        name: 'blueprint with no phase headings',
        doc: '# Plan\n\n## Execution Blueprint\n\n- Task 1\n',
        expected: undefined,
      },
    ];
    for (const c of cases) {
      expect(parseBlueprintPhases(c.doc), c.name).toEqual(c.expected);
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

  const bundledScript = path.join(
    builtSkillDir('st-execute-blueprint'),
    'scripts',
    'create-feature-branch.cjs'
  );

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
    execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@test.com'], {
      cwd: root,
      stdio: 'pipe',
    });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root, stdio: 'pipe' });
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

  const runScript = (
    planFile: string,
    cwd: string = tempDir,
    env: Record<string, string | undefined> = process.env
  ) => {
    const result = spawnSync('node', [bundledScript, planFile], {
      cwd,
      encoding: 'utf8',
      env,
    });
    return {
      status: result.status,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  };

  const currentBranch = (): string =>
    execFileSync('git', ['branch', '--show-current'], {
      cwd: tempDir,
      encoding: 'utf8',
    }).trim();

  test('creates feature branch from clean main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    const result = runScript(planFile);
    expect(result.status).toBe(0);
    expect(result.output).toContain('Created and switched to branch: feature/42--my-test-plan');
    expect(currentBranch()).toBe('feature/42--my-test-plan');
  });

  test('skips branch creation when not on main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    execFileSync('git', ['checkout', '-b', 'other-branch'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    const result = runScript(planFile);
    expect(result.status).toBe(0);
    expect(result.output).toContain('Not on main/master branch');
    expect(result.output).toContain('Proceeding without creating a new branch');
  });

  test('creates a feature branch without modifying staged or unstaged workspace state', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    fs.appendFileSync(planFile, 'workspace edit\n');
    execFileSync('git', ['add', planFile], { cwd: tempDir, stdio: 'pipe' });
    const taskFile = path.join(path.dirname(planFile), 'tasks', '01--task.md');
    writeFile(taskFile, 'generated task');
    const statusBefore = execFileSync('git', ['status', '--porcelain'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    const planBefore = fs.readFileSync(planFile, 'utf8');

    const result = runScript(planFile);

    expect(result.status).toBe(0);
    expect(result.output).toContain('Created and switched to branch: feature/42--my-test-plan');
    expect(currentBranch()).toBe('feature/42--my-test-plan');
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: tempDir, encoding: 'utf8' })).toBe(
      statusBefore
    );
    expect(fs.readFileSync(planFile, 'utf8')).toBe(planBefore);
    expect(fs.readFileSync(taskFile, 'utf8')).toBe('generated task');
  });

  test.each([
    [
      'tracked modification',
      (root: string) => fs.writeFileSync(path.join(root, 'init.txt'), 'changed'),
    ],
    ['tracked deletion', (root: string) => fs.rmSync(path.join(root, 'init.txt'))],
    [
      'staged modification',
      (root: string) => {
        fs.writeFileSync(path.join(root, 'init.txt'), 'staged');
        execFileSync('git', ['add', 'init.txt'], { cwd: root, stdio: 'pipe' });
      },
    ],
    [
      'rename',
      (root: string) =>
        execFileSync('git', ['mv', 'init.txt', 'renamed.txt'], { cwd: root, stdio: 'pipe' }),
    ],
    ['untracked file', (root: string) => fs.writeFileSync(path.join(root, 'dirty.txt'), 'dirty')],
  ])('blocks an outside-workspace %s on main', (_state, makeDirty) => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    makeDirty(tempDir);

    const result = runScript(planFile);

    expect(result.status).toBe(1);
    expect(result.output).toContain('Uncommitted changes detected outside .ai/strikethroo');
    expect(result.output).toContain('Commit or stash changes outside .ai/strikethroo');
    expect(currentBranch()).toBe('main');
  });

  test('blocks repository-root dirt when invoked from a nested workspace directory', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    fs.writeFileSync(path.join(tempDir, 'dirty.txt'), 'outside workspace');

    const result = runScript(planFile, path.dirname(planFile));

    expect(result.status).toBe(1);
    expect(result.output).toContain('Uncommitted changes detected outside .ai/strikethroo');
    expect(currentBranch()).toBe('main');
  });

  test('allows root-workspace-only dirt when invoked from a nested workspace directory', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    const taskFile = path.join(path.dirname(planFile), 'tasks', '01--task.md');
    writeFile(taskFile, 'generated task');
    const statusBefore = execFileSync('git', ['status', '--porcelain'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    const result = runScript(planFile, path.dirname(planFile));

    expect(result.status).toBe(0);
    expect(result.output).toContain('Created and switched to branch: feature/42--my-test-plan');
    expect(currentBranch()).toBe('feature/42--my-test-plan');
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: tempDir, encoding: 'utf8' })).toBe(
      statusBefore
    );
    expect(fs.readFileSync(taskFile, 'utf8')).toBe('generated task');
  });

  test('fails closed and leaves main unchanged when Git status inspection fails', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
    const fakeBin = path.join(tempDir, 'fake-bin');
    const fakeGit = path.join(fakeBin, 'git');
    writeFile(
      fakeGit,
      `#!/bin/sh\nif [ "$1" = "status" ]; then\n  echo "simulated status failure" >&2\n  exit 2\nfi\nexec "${realGit}" "$@"\n`
    );
    fs.chmodSync(fakeGit, 0o755);

    const result = runScript(planFile, tempDir, {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('Could not inspect git status');
    expect(currentBranch()).toBe('main');
  });

  test('checks out existing branch when on main', () => {
    const planFile = buildGitFixture(tempDir, 'my-test-plan', 42);
    execFileSync('git', ['checkout', '-b', 'feature/42--my-test-plan'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['checkout', 'main'], { cwd: tempDir, stdio: 'pipe' });
    const result = runScript(planFile);
    expect(result.status).toBe(0);
    expect(result.output).toContain('already exists');
    expect(result.output).toContain('Switched to existing branch: feature/42--my-test-plan');
    expect(currentBranch()).toBe('feature/42--my-test-plan');
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
    fs.cpSync(builtSkillDir('st-execute-blueprint'), fixtureSkillDir, { recursive: true });
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
    fs.cpSync(builtSkillDir('st-refine-plan'), fixtureSkillDir, { recursive: true });
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

describe('task metadata reader', () => {
  const doc = (frontmatter: string, eol = '\n'): string =>
    ['---', ...frontmatter.split('\n'), '---', '# Body', ''].join(eol);

  test('reads supported status and dependency shapes', () => {
    const cases: Array<{ name: string; markdown: string; status: string; dependencies: number[] }> =
      [
        {
          name: 'quoted status with trailing comment, flow list',
          markdown: doc('id: 3\nstatus: "completed"  # done\ndependencies: [1, 2]'),
          status: 'completed',
          dependencies: [1, 2],
        },
        {
          name: 'CRLF with block list',
          markdown: doc('id: 3\nstatus: pending\ndependencies:\n  - 1\n  - 2', '\r\n'),
          status: 'pending',
          dependencies: [1, 2],
        },
        {
          name: 'quoted items and trailing comment in a flow list',
          markdown: doc('status: "in-progress"\ndependencies: ["1", \'2\'] # both'),
          status: 'in-progress',
          dependencies: [1, 2],
        },
        {
          name: 'block list with quoted items and comments',
          markdown: doc('status: in-progress\ndependencies:\n  - "1" # first\n  - \'2\'  # second'),
          status: 'in-progress',
          dependencies: [1, 2],
        },
        {
          name: 'needs-clarification with trailing comment',
          markdown: doc('status: "needs-clarification" # ask first\ndependencies: []'),
          status: 'needs-clarification',
          dependencies: [],
        },
        {
          name: 'failed, written by st-execute-task',
          markdown: doc('status: "failed"\ndependencies: []'),
          status: 'failed',
          dependencies: [],
        },
        {
          name: 'absent dependencies key means no dependencies',
          markdown: doc('status: pending\nskills:\n  - typescript'),
          status: 'pending',
          dependencies: [],
        },
        {
          name: 'BOM and CRLF before the fence',
          markdown: '\ufeff' + doc('status: completed\ndependencies: [1]', '\r\n'),
          status: 'completed',
          dependencies: [1],
        },
      ];
    for (const c of cases) {
      const result = readTaskMetadata(c.markdown);
      expect(result, c.name).toEqual({
        kind: 'metadata',
        metadata: { status: c.status, dependencies: c.dependencies },
      });
    }
  });

  test('rejects missing, malformed, or unrecognized metadata with the offending value', () => {
    const cases: Array<{ name: string; markdown: string; reason: string }> = [
      { name: 'no frontmatter', markdown: '# Just a body\n', reason: 'frontmatter not found' },
      {
        name: 'language-tagged fence',
        markdown: '---js\nstatus: pending\n---\n',
        reason: 'Executable or non-YAML frontmatter is not supported.',
      },
      {
        name: 'non-mapping frontmatter',
        markdown: '---\n- status\n- pending\n---\n',
        reason: 'Frontmatter must be a YAML mapping.',
      },
      {
        name: 'duplicate status keys',
        markdown: doc('status: pending\nstatus: completed'),
        reason: 'duplicated mapping key',
      },
      {
        name: 'missing status',
        markdown: doc('id: 1\ndependencies: []'),
        reason: 'status is missing',
      },
      {
        name: 'status outside the enum',
        markdown: doc('status: complete\ndependencies: []'),
        reason: 'status "complete" is not one of',
      },
      {
        name: 'status that is not a string',
        markdown: doc('status: 5\ndependencies: []'),
        reason: 'status 5 is not one of',
      },
      {
        name: 'dependencies as a bare string',
        markdown: doc('status: pending\ndependencies: "one, two"'),
        reason: 'dependencies must be a list of integer task ids; got "one, two"',
      },
      {
        name: 'dependencies as a mapping',
        markdown: doc('status: pending\ndependencies:\n  first: 1'),
        reason: 'dependencies must be a list of integer task ids; got {"first":1}',
      },
      {
        name: 'dependencies with a non-integer item',
        markdown: doc('status: pending\ndependencies: [1, two]'),
        reason: 'dependencies must be a list of integer task ids; got [1,"two"]',
      },
      {
        name: 'dependencies with a fractional item',
        markdown: doc('status: pending\ndependencies: [1.5]'),
        reason: 'dependencies must be a list of integer task ids; got [1.5]',
      },
      {
        name: 'dependencies key with no value',
        markdown: doc('status: pending\ndependencies:'),
        reason: 'dependencies must be a list of integer task ids; got null',
      },
      // A self-referencing alias parses as a cyclic value. The preview must
      // describe it, not throw out of a reader that promises never to.
      {
        name: 'dependencies as a self-referencing alias',
        markdown: doc('status: pending\ndependencies: &d [*d]'),
        reason: 'dependencies must be a list of integer task ids; got ["[Circular]"]',
      },
      {
        name: 'status as a self-referencing alias',
        markdown: doc('status: &s [*s]\ndependencies: []'),
        reason: 'status ["[Circular]"] is not one of',
      },
      // A shared alias is the same reference twice, not a cycle; the preview
      // must print both copies.
      {
        name: 'dependencies sharing one non-cyclic alias',
        markdown: doc('status: pending\ndependencies: [&a {x: 1}, *a]'),
        reason: 'dependencies must be a list of integer task ids; got [{"x":1},{"x":1}]',
      },
    ];
    for (const c of cases) {
      const result = readTaskMetadata(c.markdown);
      expect(result.kind, c.name).toBe('rejected');
      if (result.kind === 'rejected') expect(result.reason, c.name).toContain(c.reason);
    }
  });

  test('collectTaskReadinessIssues blocks on rejected metadata and unmet dependencies', () => {
    const planDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-readiness-'));
    try {
      const tasksDir = path.join(planDir, 'tasks');
      fs.mkdirSync(tasksDir);
      const write = (name: string, body: string) =>
        fs.writeFileSync(path.join(tasksDir, name), body);
      write('01--done.md', doc('status: "completed"  # done\ndependencies: []'));
      write('02--crlf.md', doc('status: pending\ndependencies:\n  - 1', '\r\n'));
      write('03--pending.md', doc('status: pending\ndependencies: []'));
      write('04--bad-deps.md', doc('status: pending\ndependencies: "one, two"'));
      write('05--waits-on-pending.md', doc('status: pending\ndependencies: [3]'));
      write('06--waits-on-bad.md', doc('status: pending\ndependencies: [4, 99]'));
      write('07--typo-status.md', doc('status: complete\ndependencies: []'));
      write('08--no-status.md', doc('id: 8\ndependencies: []'));
      write('09--ask.md', doc('status: "needs-clarification" # ask first\ndependencies: [1]'));
      write('10--tagged.md', '---js\nstatus: pending\n---\n');
      write('12--cyclic-deps.md', doc('status: pending\ndependencies: &d [*d]'));
      write('13--waits-on-cyclic.md', doc('status: pending\ndependencies: [12]'));

      expect(collectTaskReadinessIssues(planDir, 2)).toEqual([]);
      expect(collectTaskReadinessIssues(planDir, '03')).toEqual([]);

      expect(collectTaskReadinessIssues(planDir, 4)).toEqual([
        {
          taskId: '4',
          kind: 'invalid-metadata',
          detail: 'dependencies must be a list of integer task ids; got "one, two"',
        },
      ]);
      expect(collectTaskReadinessIssues(planDir, 5)).toEqual([
        { taskId: '5', kind: 'unresolved-dependency', detail: 'dependency 3 status is pending' },
      ]);
      expect(collectTaskReadinessIssues(planDir, 6)).toEqual([
        {
          taskId: '6',
          kind: 'unresolved-dependency',
          detail:
            'dependency 4 has invalid metadata: dependencies must be a list of integer task ids; got "one, two"',
        },
        { taskId: '6', kind: 'unresolved-dependency', detail: 'dependency 99 not found' },
      ]);
      expect(collectTaskReadinessIssues(planDir, 7)).toEqual([
        {
          taskId: '7',
          kind: 'invalid-metadata',
          detail:
            'status "complete" is not one of pending, in-progress, completed, needs-clarification, failed',
        },
      ]);
      expect(collectTaskReadinessIssues(planDir, 8)).toEqual([
        {
          taskId: '8',
          kind: 'invalid-metadata',
          detail:
            'status is missing; expected one of pending, in-progress, completed, needs-clarification, failed',
        },
      ]);
      expect(collectTaskReadinessIssues(planDir, 9)).toEqual([
        { taskId: '9', kind: 'needs-clarification', detail: 'status is needs-clarification' },
      ]);
      expect(collectTaskReadinessIssues(planDir, 10)).toEqual([
        {
          taskId: '10',
          kind: 'invalid-metadata',
          detail: 'Executable or non-YAML frontmatter is not supported.',
        },
      ]);
      expect(collectTaskReadinessIssues(planDir, 11)).toEqual([
        { taskId: '11', kind: 'missing', detail: 'task file not found' },
      ]);
      expect(collectTaskReadinessIssues(planDir, 12)).toEqual([
        {
          taskId: '12',
          kind: 'invalid-metadata',
          detail: 'dependencies must be a list of integer task ids; got ["[Circular]"]',
        },
      ]);
      expect(collectTaskReadinessIssues(planDir, 13)).toEqual([
        {
          taskId: '13',
          kind: 'unresolved-dependency',
          detail:
            'dependency 12 has invalid metadata: dependencies must be a list of integer task ids; got ["[Circular]"]',
        },
      ]);
    } finally {
      fs.rmSync(planDir, { recursive: true, force: true });
    }
  });

  test('rewriteTaskStatus changes only the root status line and keeps every other byte', () => {
    const cases: Array<{ name: string; input: string; expected: string }> = [
      {
        name: 'CRLF with quoted value and trailing comment',
        input:
          '---\r\nid: 1\r\nstatus: "pending"  # keep me\r\ndependencies: []\r\n---\r\n# Body\r\n',
        expected:
          '---\r\nid: 1\r\nstatus: "completed"  # keep me\r\ndependencies: []\r\n---\r\n# Body\r\n',
      },
      {
        name: 'unquoted value with comment, nested status, and a status line in the body',
        input: '---\nstatus: pending # c\nmeta:\n  status: other\n---\n# Body\nstatus: body-line\n',
        expected:
          '---\nstatus: "completed" # c\nmeta:\n  status: other\n---\n# Body\nstatus: body-line\n',
      },
    ];
    for (const c of cases) {
      expect(rewriteTaskStatus(c.input, 'completed'), c.name).toBe(c.expected);
    }
  });
});

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
      builtSkillDir('st-execute-blueprint'),
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
      builtSkillDir('st-execute-blueprint'),
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
      builtSkillDir('st-execute-blueprint'),
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

  test('bounds phase membership to the blueprint section when an execution summary follows', () => {
    buildTaskFixture(tempDir, 7, 'phase-summary', [
      { id: 1, status: 'completed', dependencies: [] },
      { id: 2, status: 'completed', dependencies: [] },
      { id: 3, status: 'pending', dependencies: [1, 2] },
    ]);
    const planFile = path.join(
      tempDir,
      '.ai',
      'strikethroo',
      'plans',
      '07--phase-summary',
      'plan-07--phase-summary.md'
    );
    fs.appendFileSync(planFile, BLUEPRINT_SECTION + TRAILING_EXECUTION_SUMMARY);
    const script = path.join(
      builtSkillDir('st-execute-blueprint'),
      'scripts',
      'check-phase-readiness.cjs'
    );
    // The trailing summary names tasks 01, 03, and 04 in bullets. Read into
    // phase 2 they would list a missing task 04 and fail readiness.
    const result = execFileSync('node', [script, '7', '2'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(result).toContain('Tasks in phase: 3\n');
    expect(result).toContain('Phase 2 is ready to execute');
  });

  test('reads CRLF and block lists, and blocks on malformed metadata', () => {
    buildPhaseBlueprintFixture(
      tempDir,
      8,
      'phase-yaml',
      [
        { id: 1, status: 'completed', dependencies: [] },
        { id: 2, status: 'pending', dependencies: [] },
        { id: 3, status: 'pending', dependencies: [] },
        { id: 4, status: 'pending', dependencies: [] },
      ],
      [[2], [3, 4]]
    );
    const tasksDir = path.join(tempDir, '.ai', 'strikethroo', 'plans', '08--phase-yaml', 'tasks');
    fs.writeFileSync(
      path.join(tasksDir, '01--task-1.md'),
      '---\nid: 1\nstatus: "completed"  # done\ndependencies: []\n---\n# Task 1\n'
    );
    fs.writeFileSync(
      path.join(tasksDir, '02--task-2.md'),
      '---\r\nid: 2\r\nstatus: pending\r\ndependencies:\r\n  - 1\r\n---\r\n# Task 2\r\n'
    );
    fs.writeFileSync(
      path.join(tasksDir, '03--task-3.md'),
      '---\nid: 3\nstatus: pending\ndependencies: "one, two"\n---\n# Task 3\n'
    );
    fs.writeFileSync(
      path.join(tasksDir, '04--task-4.md'),
      '---\nid: 4\nstatus: "needs-clarification" # ask first\ndependencies: [1]\n---\n# Task 4\n'
    );
    const script = path.join(
      builtSkillDir('st-execute-blueprint'),
      'scripts',
      'check-phase-readiness.cjs'
    );
    const run = (phase: string): { exitCode: number; output: string } => {
      const result = spawnSync('node', [script, '8', phase], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
      return { exitCode: result.status ?? -1, output: result.stdout + result.stderr };
    };

    const ready = run('1');
    expect(ready.output).toContain('Phase 1 is ready to execute');
    expect(ready.output).not.toContain('dependency 1');
    expect(ready.exitCode).toBe(0);

    const blocked = run('2');
    expect(blocked.exitCode).toBe(1);
    expect(blocked.output).toContain(
      'Task 3: dependencies must be a list of integer task ids; got "one, two"'
    );
    expect(blocked.output).toContain('Task 4: status is needs-clarification');
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
    fs.cpSync(builtSkillDir('st-execute-task'), fixtureSkillDir, { recursive: true });
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
      builtSkillDir('st-execute-task'),
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
      builtSkillDir('st-execute-task'),
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
      builtSkillDir('st-execute-task'),
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
      builtSkillDir('st-execute-task'),
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
      builtSkillDir('st-execute-task'),
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
      builtSkillDir('st-execute-task'),
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

/**
 * One documented policy for `resolvePlan`: an absolute path addresses one plan
 * file anywhere, a bare integer addresses a plan in the nearest workspace only,
 * and either route passes through the same workspace-schema gate.
 */
describe('plan resolution policy', () => {
  /** Stands in for a real `process.exit` so the gate can be observed. */
  class ProcessExited extends Error {
    constructor(readonly code: number | undefined) {
      super(`process.exit(${String(code)})`);
    }
  }

  interface GateOutcome {
    readonly exitCode: number | undefined;
    readonly stderr: string;
  }

  const captureGate = (call: () => unknown): GateOutcome => {
    const written: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
      chunk: unknown
    ): boolean => {
      written.push(String(chunk));
      return true;
    }) as never);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number): never => {
      throw new ProcessExited(code);
    }) as never);
    try {
      call();
      return { exitCode: undefined, stderr: written.join('') };
    } catch (err) {
      if (err instanceof ProcessExited) return { exitCode: err.code, stderr: written.join('') };
      throw err;
    } finally {
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  };

  /** A workspace holding one plan, at an arbitrary recorded schema version. */
  const buildWorkspace = (
    project: string,
    planId: number,
    schemaVersion: number | undefined = 4
  ): { root: string; planFile: string } => {
    const root = path.join(project, '.ai', 'strikethroo');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(
      path.join(root, '.init-metadata.json'),
      JSON.stringify({ version: 'test', workspaceSchemaVersion: schemaVersion })
    );
    const padded = String(planId).padStart(2, '0');
    const planFile = path.join(root, 'plans', `${padded}--fixture`, `plan-${padded}--fixture.md`);
    writeFile(planFile, `---\nid: ${planId}\nsummary: "fx"\ncreated: 2026-01-01\n---\nbody\n`);
    return { root, planFile };
  };

  const POSIX_PLAN_PATH = '/srv/project/.ai/strikethroo/plans/02--x/plan-02--x.md';
  const WINDOWS_PLAN_PATH = 'C:\\work\\project\\.ai\\strikethroo\\plans\\02--x\\plan-02--x.md';

  const classificationCases: ReadonlyArray<{
    label: string;
    input: string | number;
    isAbsolute: (candidate: string) => boolean;
    expected: PlanInput;
  }> = [
    {
      label: 'a POSIX absolute path on a POSIX host',
      input: POSIX_PLAN_PATH,
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'path', planFile: POSIX_PLAN_PATH },
    },
    {
      label: 'a Windows absolute path on a Windows host',
      input: WINDOWS_PLAN_PATH,
      isAbsolute: path.win32.isAbsolute,
      expected: { kind: 'path', planFile: WINDOWS_PLAN_PATH },
    },
    {
      label: 'a Windows absolute path on a POSIX host',
      input: WINDOWS_PLAN_PATH,
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'invalid' },
    },
    {
      label: 'a numeric-looking relative input',
      input: '2',
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'id', planId: 2 },
    },
    {
      label: 'a number',
      input: 7,
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'id', planId: 7 },
    },
    {
      label: 'a relative path',
      input: 'plans/02--x/plan-02--x.md',
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'invalid' },
    },
    {
      label: 'an empty input',
      input: '',
      isAbsolute: path.posix.isAbsolute,
      expected: { kind: 'invalid' },
    },
  ];

  // `path.win32`/`path.posix` stand in for the host platform: a Windows path is
  // never read as a plan id, and on a Windows host it is read as a path.
  test.each(classificationCases)('$label', ({ input, isAbsolute, expected }) => {
    expect(_classifyPlanInput(input, isAbsolute)).toEqual(expected);
  });

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-resolve-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test.each([
    ['older than the skill', 1, 'npx strikethroo init'],
    ['newer than the skill', 99, 'npx skills add'],
  ])(
    'a workspace schema %s fails identically by path and by id',
    (_label, schemaVersion, remedy) => {
      const project = path.join(tempDir, 'project');
      const { planFile } = buildWorkspace(project, 7, schemaVersion as number);

      const byPath = captureGate(() => resolvePlan(planFile));
      const byId = captureGate(() => resolvePlan(7, project));

      expect(byPath.exitCode).toBe(1);
      expect(byPath.stderr).toContain(`v${schemaVersion}`);
      expect(byPath.stderr).toContain(remedy as string);
      expect(byId).toEqual(byPath);
    }
  );

  test('a numeric id searches only the nearest workspace', () => {
    const outer = path.join(tempDir, 'outer');
    const inner = path.join(outer, 'apps', 'inner');
    const outerWorkspace = buildWorkspace(outer, 7);
    const innerWorkspace = buildWorkspace(inner, 3);

    // Plan 7 exists in the outer workspace only; the inner lookup must not reach it.
    expect(resolvePlan(7, inner)).toBeNull();
    expect(path.resolve(resolvePlan(3, inner)!.strikethrooRoot)).toBe(
      path.resolve(innerWorkspace.root)
    );

    // An explicit path stays the deliberate route into another workspace.
    const reached = resolvePlan(outerWorkspace.planFile, inner);
    expect(reached).not.toBeNull();
    expect(reached!.planId).toBe(7);
    expect(path.resolve(reached!.strikethrooRoot)).toBe(path.resolve(outerWorkspace.root));
  });
});
