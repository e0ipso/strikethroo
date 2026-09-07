/**
 * Release-path invariants for stamping skill bundles with the published version.
 *
 * The committed skills/ mirror may lag between releases; these tests assert the
 * release configuration and the rebuild machinery, not live mirror parity.
 */

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RELEASERC_PATH = path.join(REPO_ROOT, '.releaserc.json');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const CHECK_FOR_UPDATES_REL =
  'templates/harness/skills/st-create-plan/scripts/check-for-updates.cjs';

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

  test('@semantic-release/exec prepareCmd rebuilds skills and syncs the mirror', () => {
    const execEntry = readReleaserc().plugins.find(
      (entry): entry is [string, Record<string, unknown>] =>
        pluginName(entry) === '@semantic-release/exec'
    );
    expect(execEntry).toBeDefined();

    const prepareCmd = execEntry?.[1].prepareCmd;
    expect(typeof prepareCmd).toBe('string');
    expect(prepareCmd).toContain('npm run build:skills');
    expect(prepareCmd).toContain('node scripts/sync-skills-mirror.cjs');
  });

  test('release workflow does not sync the mirror before semantic-release', () => {
    const workflow = fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'workflows', 'release.yml'),
      'utf8'
    );
    const releaseStepIndex = workflow.indexOf('npx semantic-release');
    const preReleaseSyncIndex = workflow.indexOf('node scripts/sync-skills-mirror.cjs');

    expect(releaseStepIndex).toBeGreaterThan(0);
    expect(preReleaseSyncIndex).toBe(-1);
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

  test('release rebuild+sync writes the stamped version to an isolated mirror target', () => {
    const pkg = JSON.parse(originalPackageJson) as { version: string };
    pkg.version = FAKE_VERSION;
    fs.writeFileSync(fixturePackagePath, `${JSON.stringify(pkg, null, 2)}\n`);

    const build = spawnSync('node', [path.join(fixtureRoot, 'scripts/build-skills.cjs')], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
    expect(build.status).toBe(0);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-stamp-'));
    const mirrorTarget = path.join(tempDir, 'skills');

    try {
      const sync = spawnSync('node', [path.join(fixtureRoot, 'scripts/sync-skills-mirror.cjs')], {
        cwd: fixtureRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          STRIKETHROO_MIRROR_TARGET: mirrorTarget,
        },
      });
      expect(sync.status).toBe(0);

      const mirroredBundle = fs.readFileSync(
        path.join(mirrorTarget, 'st-create-plan', 'scripts', 'check-for-updates.cjs'),
        'utf8'
      );
      expect(mirroredBundle).toContain(FAKE_VERSION);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
