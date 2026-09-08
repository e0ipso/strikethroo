/**
 * Shape checks for the Git-tree release channel: the committed root skills/
 * directory and .claude-plugin/plugin.json must be complete and agree.
 *
 * Deliberately absent: any comparison of skills/ against a fresh dist-test/
 * build. skills/ records the most recent *released* skill set and lags the
 * source between releases. CI asserts instead that it equals the last release
 * tag, and the release rebuilds it with `npm run build:release-skills`.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync, spawnSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MIRROR_DIR = path.join(REPO_ROOT, 'skills');
const PLUGIN_MANIFEST = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

describe('generated artifact pre-commit guard', () => {
  let repo: string;
  const artifact = 'skills/example/SKILL.md';
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const runHook = () =>
    spawnSync('sh', ['-e', path.join(REPO_ROOT, '.husky/pre-commit')], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${path.join(repo, 'bin')}:${process.env.PATH}` },
    });
  const stageArtifact = (body: string) => {
    fs.writeFileSync(path.join(repo, artifact), body);
    git('add', artifact);
  };
  const startMerge = () => {
    git('checkout', '-b', 'incoming');
    stageArtifact('released artifact\n');
    git('commit', '-m', 'chore: release');
    git('checkout', 'main');
    git('commit', '--allow-empty', '-m', 'chore: local work');
    git('merge', '--no-commit', '--no-ff', 'incoming');
  };

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-guard-'));
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.com');
    git('config', 'commit.gpgsign', 'false');
    fs.mkdirSync(path.dirname(path.join(repo, artifact)), { recursive: true });
    stageArtifact('previous release\n');
    git('commit', '-m', 'chore: initial release');
    // Exercise the real guard without running nested lint and test suites.
    fs.mkdirSync(path.join(repo, 'bin'));
    for (const command of ['npm', 'npx']) {
      fs.writeFileSync(path.join(repo, 'bin', command), '#!/bin/sh\necho "$0 $*"\n', {
        mode: 0o755,
      });
    }
  });

  afterEach(() => fs.rmSync(repo, { recursive: true, force: true }));

  test('accepts incoming release artifacts and continues both gates', () => {
    startMerge();
    const result = runHook();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('npx lint-staged');
    expect(result.stdout).toContain('npm test');
  });

  test('rejects edited artifacts even during a merge', () => {
    startMerge();
    stageArtifact('local edit\n');
    const result = runHook();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(artifact);
  });

  test('rejects edits outside a merge but permits deletions', () => {
    stageArtifact('local edit\n');
    expect(runHook().status).toBe(1);
    git('rm', '-f', artifact);
    expect(runHook().status).toBe(0);
  });
});

/** Matches an in-skill script reference; a bare cross-skill filename is not one. */
const SCRIPT_REFERENCE = /scripts\/[A-Za-z0-9_-]+\.cjs/g;

const listDirectories = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

describe('committed skills/ mirror completeness', () => {
  const EXPECTED_SKILLS = [
    'st-code-review',
    'st-create-plan',
    'st-execute-blueprint',
    'st-execute-task',
    'st-full-workflow',
    'st-generate-tasks',
    'st-refine-plan',
  ];

  test('holds exactly the seven shipping skill directories and nothing else', () => {
    expect(listDirectories(MIRROR_DIR)).toEqual(EXPECTED_SKILLS);
  });

  test('every skill directory carries a non-empty SKILL.md', () => {
    for (const skill of listDirectories(MIRROR_DIR)) {
      const skillFile = path.join(MIRROR_DIR, skill, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      expect(fs.readFileSync(skillFile, 'utf8').trim().length).toBeGreaterThan(0);
    }
  });

  test('every scripts/*.cjs referenced by a SKILL.md ships in that skill', () => {
    const references: string[] = [];
    const dangling: string[] = [];

    for (const skill of listDirectories(MIRROR_DIR)) {
      const body = fs.readFileSync(path.join(MIRROR_DIR, skill, 'SKILL.md'), 'utf8');
      for (const rel of new Set(body.match(SCRIPT_REFERENCE) ?? [])) {
        references.push(`${skill}/${rel}`);
        if (!fs.existsSync(path.join(MIRROR_DIR, skill, ...rel.split('/')))) {
          dangling.push(`${skill}/${rel}`);
        }
      }
    }

    // Guards the scan itself: a reference regex that matched nothing would
    // make the assertion below vacuously true.
    expect(references.length).toBeGreaterThan(0);
    expect(dangling).toEqual([]);
  });
});

describe('.claude-plugin/plugin.json alignment with the mirror', () => {
  const entries: string[] = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, 'utf8')).skills;

  test('every entry is a ./skills/ path resolving to an existing mirror directory', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      // The upstream scanner drops relative forms other than "./"-prefixed.
      expect(entry.startsWith('./skills/')).toBe(true);
      const resolved = path.join(REPO_ROOT, entry);
      expect(fs.existsSync(resolved)).toBe(true);
      expect(fs.statSync(resolved).isDirectory()).toBe(true);
    }
  });

  test('the entry set matches the mirror directory set exactly', () => {
    expect(entries.map(entry => path.basename(entry)).sort()).toEqual(listDirectories(MIRROR_DIR));
  });
});
