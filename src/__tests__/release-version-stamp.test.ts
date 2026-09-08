/**
 * Release-path invariants for stamping skill bundles with the published version.
 *
 * The committed skills/ tree may lag between releases; these tests assert the
 * release configuration and the rebuild machinery, not live parity.
 */

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RELEASERC_PATH = path.join(REPO_ROOT, '.releaserc.json');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const CHECK_FOR_UPDATES_REL = 'dist-test/st-create-plan/scripts/check-for-updates.cjs';

type Releaserc = {
  plugins: Array<string | [string, Record<string, unknown>]>;
};

const pluginName = (entry: string | [string, Record<string, unknown>]): string =>
  typeof entry === 'string' ? entry : entry[0];

const readReleaserc = (): Releaserc => JSON.parse(fs.readFileSync(RELEASERC_PATH, 'utf8'));

describe('release version stamp configuration', () => {
  test('.releaserc.json lists @semantic-release/exec prepare after npm and before git', () => {
    const names = readReleaserc().plugins.map(pluginName);
    const npmIndex = names.indexOf('@semantic-release/npm');
    const execIndex = names.indexOf('@semantic-release/exec');
    const gitIndex = names.indexOf('@semantic-release/git');

    expect(npmIndex).toBeGreaterThanOrEqual(0);
    expect(execIndex).toBeGreaterThan(npmIndex);
    expect(gitIndex).toBeGreaterThan(execIndex);
  });

  test('@semantic-release/exec prepareCmd rebuilds skills/ through build:release-skills', () => {
    const execEntry = readReleaserc().plugins.find(
      (entry): entry is [string, Record<string, unknown>] =>
        pluginName(entry) === '@semantic-release/exec'
    );
    expect(execEntry).toBeDefined();
    expect(execEntry?.[1].prepareCmd).toBe('npm run build:release-skills');
  });

  test('build:release-skills wipes and rebuilds the tracked skills/ tree with both builders', () => {
    const { scripts } = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(scripts['build:release-skills']).toContain('build:skills -- --out skills --clean');
    expect(scripts['build:release-skills']).toContain('build:skill-prompts -- --out skills');
  });

  test('@semantic-release/git commits skills/** and nothing else generated', () => {
    const gitEntry = readReleaserc().plugins.find(
      (entry): entry is [string, Record<string, unknown>] =>
        pluginName(entry) === '@semantic-release/git'
    );
    expect(gitEntry?.[1].assets).toContain('skills/**');
    expect(gitEntry?.[1].assets).not.toContain('dist-test/**');
  });

  test('release workflow does not rebuild skills/ before semantic-release', () => {
    const workflow = fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'workflows', 'release.yml'),
      'utf8'
    );
    expect(workflow.indexOf('npx semantic-release')).toBeGreaterThan(0);
    expect(workflow).not.toContain('build:release-skills');
    expect(workflow).not.toContain('--out skills');
  });

  test('both CI workflows fail when skills/ differs from the last release tag', () => {
    for (const name of ['release.yml', 'test.yml']) {
      const workflow = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', name), 'utf8');
      expect(workflow).toContain("git describe --tags --abbrev=0 --match 'v*'");
      expect(workflow).toContain('git diff --exit-code --stat "$tag" -- skills/');
      expect(workflow).toContain('fetch-depth: 0');
    }
  });
});

describe('release skill bundle stamp rehearsal', () => {
  const FAKE_VERSION = '99.88.77-stamp-rehearsal';
  let originalPackageJson: string;
  let fixtureRoot: string;
  let fixturePackagePath: string;

  beforeAll(() => {
    if (!fs.existsSync(path.join(REPO_ROOT, 'dist', 'metadata.js'))) {
      execFileSync('npx', ['tsc', '-p', 'tsconfig.json', '--pretty', 'false'], {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      });
    }
  });

  beforeEach(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-build-'));
    fixturePackagePath = path.join(fixtureRoot, 'package.json');
    originalPackageJson = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    for (const directory of ['src', 'scripts', 'templates']) {
      fs.cpSync(path.join(REPO_ROOT, directory), path.join(fixtureRoot, directory), {
        recursive: true,
      });
    }
    fs.mkdirSync(path.join(fixtureRoot, 'dist'));
    fs.copyFileSync(
      path.join(REPO_ROOT, 'dist/metadata.js'),
      path.join(fixtureRoot, 'dist/metadata.js')
    );
    fs.symlinkSync(
      path.join(REPO_ROOT, 'node_modules'),
      path.join(fixtureRoot, 'node_modules'),
      'junction'
    );
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  test('build:skills stamps package.json version into check-for-updates.cjs', () => {
    const pkg = JSON.parse(originalPackageJson) as { version: string };
    pkg.version = FAKE_VERSION;
    fs.writeFileSync(fixturePackagePath, `${JSON.stringify(pkg, null, 2)}\n`);

    const build = spawnSync('node', [path.join(fixtureRoot, 'scripts/build-skills.cjs')], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
    expect(build.status).toBe(0);

    const bundlePath = path.join(fixtureRoot, CHECK_FOR_UPDATES_REL);
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    expect(bundle).toContain(FAKE_VERSION);
    expect(bundle).not.toContain('SKILL_RELEASE_VERSION');
  });

  test('--out skills --clean replaces the release tree wholesale and stamps it', () => {
    const pkg = JSON.parse(originalPackageJson) as { version: string };
    pkg.version = FAKE_VERSION;
    fs.writeFileSync(fixturePackagePath, `${JSON.stringify(pkg, null, 2)}\n`);

    const releaseTree = path.join(fixtureRoot, 'skills');
    const stale = path.join(releaseTree, 'st-retired', 'SKILL.md');
    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, 'retired skill\n');
    const staleBundle = path.join(releaseTree, 'st-create-plan', 'scripts', 'stale.cjs');
    fs.mkdirSync(path.dirname(staleBundle), { recursive: true });
    fs.writeFileSync(staleBundle, 'console.log("stale");\n');

    const build = spawnSync(
      'node',
      [path.join(fixtureRoot, 'scripts/build-skills.cjs'), '--out', 'skills', '--clean'],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );
    expect(build.status).toBe(0);
    const prompts = spawnSync(
      'node',
      [path.join(fixtureRoot, 'scripts/build-skill-prompts.cjs'), '--out', 'skills'],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );
    expect(prompts.status).toBe(0);

    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(staleBundle)).toBe(false);
    expect(fs.existsSync(path.join(fixtureRoot, 'dist-test'))).toBe(false);
    const bundle = fs.readFileSync(
      path.join(releaseTree, 'st-create-plan', 'scripts', 'check-for-updates.cjs'),
      'utf8'
    );
    expect(bundle).toContain(FAKE_VERSION);
    expect(fs.readFileSync(path.join(releaseTree, 'st-create-plan', 'SKILL.md'), 'utf8')).toMatch(
      /^---\nname: st-create-plan/
    );
  });

  test('--out refuses a directory outside the repository', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
    try {
      const build = spawnSync(
        'node',
        [path.join(fixtureRoot, 'scripts/build-skills.cjs'), '--out', outside, '--clean'],
        { cwd: fixtureRoot, encoding: 'utf8' }
      );
      expect(build.status).not.toBe(0);
      expect(fs.existsSync(outside)).toBe(true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
