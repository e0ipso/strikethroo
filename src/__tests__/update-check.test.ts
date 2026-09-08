import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { builtSkillDir } from './built-skills';

import {
  ATTEMPT_INTERVAL_MS,
  checkForUpdates,
  compareToRelease,
  createDefaultDependencies,
  LOCK_STALE_MS,
  STATE_RELATIVE_PATH,
  type UpdateCheckDependencies,
  type UpdateCheckState,
} from '../skill-scripts/shared/update-check';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const initGitWorkspace = (
  root: string,
  options: {
    workspaceVersion: string;
    harnesses?: string[];
    includeRuntimeIgnore?: boolean;
  }
): string => {
  const strikethrooRoot = path.join(root, '.ai', 'strikethroo');
  fs.mkdirSync(strikethrooRoot, { recursive: true });

  const metadata: Record<string, unknown> = {
    version: options.workspaceVersion,
    workspaceSchemaVersion: 4,
  };
  if (options.harnesses) {
    metadata.harnesses = options.harnesses;
  }
  writeFile(path.join(strikethrooRoot, '.init-metadata.json'), JSON.stringify(metadata));

  const gitignoreLines = ['config/config.yaml', 'plans/*/review/', 'archive/*/review/'];
  if (options.includeRuntimeIgnore !== false) {
    gitignoreLines.push('runtime/');
  }
  writeFile(path.join(strikethrooRoot, '.gitignore'), `${gitignoreLines.join('\n')}\n`);

  execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: root, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root, stdio: 'pipe' });
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n');
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: root, stdio: 'pipe' });

  return strikethrooRoot;
};

const makeDeps = (
  strikethrooRoot: string,
  overrides: {
    now?: () => number;
    skillVersion?: string;
    fetchLatestRelease?: () => Promise<string | null>;
    fetchCalls?: { count: number };
  } = {}
): UpdateCheckDependencies => {
  const nowMs = overrides.now ? overrides.now() : Date.now();
  const fetchCalls = overrides.fetchCalls ?? { count: 0 };
  return {
    ...createDefaultDependencies(),
    now: () => nowMs,
    skillVersion: overrides.skillVersion ?? '3.0.0',
    fetchLatestRelease:
      overrides.fetchLatestRelease ??
      (async () => {
        fetchCalls.count += 1;
        return '3.21.0';
      }),
  };
};

describe('compareToRelease', () => {
  test('orders semver correctly', () => {
    expect(compareToRelease('3.20.0', '3.21.0')).toBe('outdated');
    expect(compareToRelease('3.21.0', '3.21.0')).toBe('current');
    expect(compareToRelease('3.22.0', '3.21.0')).toBe('ahead');
    expect(compareToRelease('not-a-version', '3.21.0')).toBe('unknown');
    expect(compareToRelease('3.21.0', null)).toBe('unknown');
    expect(compareToRelease('version 3.0.0', '3.21.0')).toBe('unknown');
    expect(compareToRelease('3.21.0-rc.1', '3.21.0')).toBe('outdated');
  });
});

describe('checkForUpdates integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-check-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  test('persists the attempt before network I/O, including rejected requests', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const statePath = path.join(root, STATE_RELATIVE_PATH);
    const fetchLatestRelease = vi.fn(async () => {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as UpdateCheckState;
      expect(state.lastAttemptAt).toBeDefined();
      throw new Error('connection reset');
    });
    const deps = makeDeps(root, { fetchLatestRelease });
    await expect(checkForUpdates(root, deps)).resolves.toMatchObject({ noticeEligible: false });
    await checkForUpdates(root, deps);
    expect(fetchLatestRelease).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fs.readFileSync(statePath, 'utf8')).lastAttemptAt).toBeDefined();
  });

  test('does not attempt a request when the throttle cannot be saved', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const fetchLatestRelease = vi.fn(async () => '3.21.0');
    const result = await checkForUpdates(root, {
      ...makeDeps(root, { fetchLatestRelease }),
      writeTextFile: () => false,
    });
    expect(result.noticeEligible).toBe(false);
    expect(fetchLatestRelease).not.toHaveBeenCalled();
  });

  test('reads state after acquiring the lock when another process just finished', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const deps = makeDeps(root);
    const fetchLatestRelease = vi.fn(async () => '3.21.0');
    const result = await checkForUpdates(root, {
      ...deps,
      fetchLatestRelease,
      tryAcquireLock: lockPath => {
        writeFile(
          path.join(root, STATE_RELATIVE_PATH),
          JSON.stringify({
            lastAttemptAt: new Date(deps.now()).toISOString(),
            lastSuccessfulRelease: '3.21.0',
            lastNoticeIssuedAt: new Date(deps.now()).toISOString(),
          })
        );
        return deps.tryAcquireLock(lockPath);
      },
    });
    expect(result.latestRelease).toBe('3.21.0');
    expect(result.noticeEligible).toBe(false);
    expect(fetchLatestRelease).not.toHaveBeenCalled();
  });

  test.each([
    { tag_name: 'version 99.0.0 is available' },
    { tag_name: 'v99.0' },
    { tag_name: 'v99.0.0; echo injected' },
    { tag_name: 'v99.0.0-beta.1' },
    { tag_name: 'v99.0.0', prerelease: true },
    { tag_name: 'v99.0.0', draft: true },
  ])('rejects invalid or non-stable release payload %j', async payload => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload)))
    );
    const result = await checkForUpdates(root, { skillVersion: '3.0.0' });
    expect(result.latestRelease).toBeNull();
    expect(result.noticeEligible).toBe(false);
    expect(
      JSON.parse(fs.readFileSync(path.join(root, STATE_RELATIVE_PATH), 'utf8')).lastAttemptFailed
    ).toBe(true);
  });

  test('uses the actual ignored workspace path inside a monorepo', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const nestedProject = path.join(tempDir, 'packages', 'nested');
    const nestedRoot = path.join(nestedProject, '.ai', 'strikethroo');
    fs.mkdirSync(path.dirname(nestedRoot), { recursive: true });
    fs.renameSync(root, nestedRoot);
    const result = await checkForUpdates(nestedRoot, makeDeps(nestedRoot));
    expect(result.noticeEligible).toBe(true);
    expect(fs.existsSync(path.join(nestedRoot, STATE_RELATIVE_PATH))).toBe(true);
  });

  test('does not use another workspace ignore rule for an unignored nested workspace', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const nestedRoot = path.join(tempDir, 'packages', 'nested', '.ai', 'strikethroo');
    writeFile(
      path.join(nestedRoot, '.init-metadata.json'),
      fs.readFileSync(path.join(root, '.init-metadata.json'), 'utf8')
    );
    const fetchLatestRelease = vi.fn(async () => '3.21.0');
    await checkForUpdates(nestedRoot, makeDeps(nestedRoot, { fetchLatestRelease }));
    expect(fetchLatestRelease).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(nestedRoot, STATE_RELATIVE_PATH))).toBe(false);
  });

  test.each([{ harnesses: [] }, { harnesses: ['invalid'] }, { harnesses: 'claude' }])(
    'requires a harness prompt for unusable saved selection %j',
    async ({ harnesses }) => {
      const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
      writeFile(
        path.join(root, '.init-metadata.json'),
        JSON.stringify({ version: '3.0.0', harnesses })
      );
      const result = await checkForUpdates(root, makeDeps(root));
      expect(result.needsHarnessPrompt).toBe(true);
    }
  );

  test('outdated workspace only issues notice with saved harnesses', async () => {
    const root = initGitWorkspace(tempDir, {
      workspaceVersion: '3.0.0',
      harnesses: ['claude'],
    });
    const deps = makeDeps(root, { skillVersion: '3.21.0' });
    const result = await checkForUpdates(root, deps);

    expect(result.noticeEligible).toBe(true);
    expect(result.workspaceDisposition).toBe('outdated');
    expect(result.skillDisposition).toBe('current');
    expect(result.needsHarnessPrompt).toBe(false);
    expect(result.updateCommand).toBe(
      `npx strikethroo@latest update --destination-directory '${tempDir}'`
    );
    expect(result.notice).toContain('npx strikethroo@latest update');
  });

  test('outdated skill only', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.21.0', harnesses: ['claude'] });
    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '3.0.0' }));

    expect(result.noticeEligible).toBe(true);
    expect(result.workspaceDisposition).toBe('current');
    expect(result.skillDisposition).toBe('outdated');
  });

  test('both components outdated', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '2.0.0' }));

    expect(result.noticeEligible).toBe(true);
    expect(result.workspaceDisposition).toBe('outdated');
    expect(result.skillDisposition).toBe('outdated');
  });

  test('equal and ahead local versions are not outdated', async () => {
    const equalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-equal-'));
    const equalRoot = initGitWorkspace(equalDir, {
      workspaceVersion: '3.21.0',
      harnesses: ['claude'],
    });
    const equal = await checkForUpdates(equalRoot, makeDeps(equalRoot, { skillVersion: '3.21.0' }));
    expect(equal.noticeEligible).toBe(false);
    expect(equal.workspaceDisposition).toBe('current');
    expect(equal.skillDisposition).toBe('current');
    fs.rmSync(equalDir, { recursive: true, force: true });

    const aheadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-ahead-'));
    const aheadRoot = initGitWorkspace(aheadDir, {
      workspaceVersion: '3.22.0',
      harnesses: ['claude'],
    });
    const ahead = await checkForUpdates(aheadRoot, makeDeps(aheadRoot, { skillVersion: '3.22.0' }));
    expect(ahead.noticeEligible).toBe(false);
    expect(ahead.workspaceDisposition).toBe('ahead');
    expect(ahead.skillDisposition).toBe('ahead');
    fs.rmSync(aheadDir, { recursive: true, force: true });
  });

  test('missing harnesses sets needsHarnessPrompt on eligible notice', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const result = await checkForUpdates(root, makeDeps(root));

    expect(result.noticeEligible).toBe(true);
    expect(result.needsHarnessPrompt).toBe(true);
    expect(result.notice).toContain('--harnesses');
  });

  test('throttles network attempts and notices inside 24h', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const fetchCalls = { count: 0 };
    const baseNow = 1_700_000_000_000;
    const deps = makeDeps(root, {
      skillVersion: '3.21.0',
      fetchCalls,
      now: () => baseNow,
    });

    const first = await checkForUpdates(root, deps);
    expect(first.noticeEligible).toBe(true);
    expect(fetchCalls.count).toBe(1);

    const repeatSoon = await checkForUpdates(root, {
      ...deps,
      now: () => baseNow + 60_000,
    });
    expect(repeatSoon.noticeEligible).toBe(false);
    expect(fetchCalls.count).toBe(1);

    const halfway = await checkForUpdates(root, {
      ...deps,
      now: () => baseNow + ATTEMPT_INTERVAL_MS / 2,
    });
    expect(halfway.noticeEligible).toBe(false);
    expect(fetchCalls.count).toBe(1);

    const afterAttemptWindow = await checkForUpdates(root, {
      ...deps,
      now: () => baseNow + ATTEMPT_INTERVAL_MS + 1,
    });
    expect(fetchCalls.count).toBe(2);
    expect(afterAttemptWindow.noticeEligible).toBe(true);

    const repeatAfterSecondNotice = await checkForUpdates(root, {
      ...deps,
      now: () => baseNow + ATTEMPT_INTERVAL_MS + 60_000,
    });
    expect(repeatAfterSecondNotice.noticeEligible).toBe(false);
    expect(fetchCalls.count).toBe(2);
  });

  test('failed request records attempt without discarding prior release', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const statePath = path.join(root, STATE_RELATIVE_PATH);
    const baseNow = 1_700_000_000_000;
    writeFile(
      statePath,
      JSON.stringify({
        lastAttemptAt: new Date(baseNow - ATTEMPT_INTERVAL_MS - 1).toISOString(),
        lastSuccessfulRelease: '3.20.0',
        lastSuccessfulReleaseAt: new Date(baseNow - ATTEMPT_INTERVAL_MS - 1).toISOString(),
      } satisfies UpdateCheckState)
    );

    const result = await checkForUpdates(
      root,
      makeDeps(root, {
        skillVersion: '3.21.0',
        now: () => baseNow,
        fetchLatestRelease: async () => null,
      })
    );

    expect(result.latestRelease).toBe('3.20.0');
    expect(result.noticeEligible).toBe(true);
    const saved = JSON.parse(fs.readFileSync(statePath, 'utf8')) as UpdateCheckState;
    expect(saved.lastAttemptFailed).toBe(true);
    expect(saved.lastSuccessfulRelease).toBe('3.20.0');
  });

  test('slow or invalid fetch returns no notice when no cached release', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const slow = await checkForUpdates(
      root,
      makeDeps(root, {
        fetchLatestRelease: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return null;
        },
      })
    );
    expect(slow.noticeEligible).toBe(false);
    expect(slow.latestRelease).toBeNull();
  });

  test('malformed cache is ignored and check still succeeds', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    writeFile(path.join(root, STATE_RELATIVE_PATH), '{not json');
    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '3.0.0' }));
    expect(result.latestRelease).toBe('3.21.0');
    expect(result.noticeEligible).toBe(true);
  });

  test('ignores cache fields with invalid types', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    writeFile(
      path.join(root, STATE_RELATIVE_PATH),
      JSON.stringify({
        lastAttemptAt: { toString: 1 },
        lastNoticeIssuedAt: { toString: 1 },
        lastSuccessfulRelease: { version: '99.0.0' },
      })
    );
    await expect(checkForUpdates(root, makeDeps(root))).resolves.toMatchObject({
      latestRelease: '3.21.0',
      noticeEligible: true,
    });
  });

  test('stale lock allows recovery and notice issuance', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const lockPath = path.join(root, 'runtime', 'update-check.lock');
    const staleAt = new Date(Date.now() - LOCK_STALE_MS - 1_000).toISOString();
    writeFile(lockPath, JSON.stringify({ pid: 999_999, claimedAt: staleAt }));

    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '3.0.0' }));
    expect(result.noticeEligible).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test('recovers an expired empty lock left by an interrupted creation', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const lockPath = path.join(root, 'runtime', 'update-check.lock');
    writeFile(lockPath, '');
    const old = new Date(Date.now() - LOCK_STALE_MS - 1_000);
    fs.utimesSync(lockPath, old, old);
    const result = await checkForUpdates(root, makeDeps(root));
    expect(result.noticeEligible).toBe(true);
  });

  test('does not steal an expired lock from a live process', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0' });
    const lockPath = path.join(root, 'runtime', 'update-check.lock');
    const payload = JSON.stringify({
      pid: process.pid,
      claimedAt: new Date(Date.now() - LOCK_STALE_MS - 1_000).toISOString(),
    });
    writeFile(lockPath, payload);
    const fetchLatestRelease = vi.fn(async () => '3.21.0');
    const result = await checkForUpdates(root, makeDeps(root, { fetchLatestRelease }));
    expect(result.noticeEligible).toBe(false);
    expect(fetchLatestRelease).not.toHaveBeenCalled();
    expect(fs.readFileSync(lockPath, 'utf8')).toBe(payload);
  });

  test('renders validated versions and targets the discovered project in notices', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    writeFile(
      path.join(root, 'config/templates/UPDATE_NOTICE_TEMPLATE.md'),
      '{{workspaceVersion}} / {{skillVersion}} → {{latestRelease}}: `{{updateCommand}}`.'
    );
    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '3.1.0' }));
    expect(result.notice).toBe(`3.0.0 / 3.1.0 → 3.21.0: \`${result.updateCommand}\`.`);
    expect(result.updateCommand).toContain(`--destination-directory '${tempDir}'`);
  });

  test('gitignore skip performs no network and no state write', async () => {
    const root = initGitWorkspace(tempDir, {
      workspaceVersion: '3.0.0',
      harnesses: ['claude'],
      includeRuntimeIgnore: false,
    });
    const fetchCalls = { count: 0 };
    const result = await checkForUpdates(
      root,
      makeDeps(root, {
        fetchCalls,
        fetchLatestRelease: async () => {
          fetchCalls.count += 1;
          return '9.9.9';
        },
      })
    );

    expect(result.noticeEligible).toBe(false);
    expect(fetchCalls.count).toBe(0);
    expect(fs.existsSync(path.join(root, STATE_RELATIVE_PATH))).toBe(false);
  });

  test('does not modify tracked init metadata', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const metadataPath = path.join(root, '.init-metadata.json');
    const before = fs.readFileSync(metadataPath, 'utf8');
    const statusBefore = execFileSync('git', ['status', '--porcelain'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    await checkForUpdates(root, makeDeps(root, { skillVersion: '3.0.0' }));

    expect(fs.readFileSync(metadataPath, 'utf8')).toBe(before);
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: tempDir, encoding: 'utf8' })).toBe(
      statusBefore
    );
  });

  test('concurrent invocations make one fetch and one notice', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const fetchCalls = { count: 0 };
    const sharedFetch = async (): Promise<string | null> => {
      fetchCalls.count += 1;
      await new Promise(resolve => setTimeout(resolve, 100));
      return '3.21.0';
    };

    const runConcurrent = async (): Promise<ReturnType<typeof checkForUpdates>> =>
      Promise.all(
        Array.from({ length: 4 }, () =>
          checkForUpdates(
            root,
            makeDeps(root, { skillVersion: '3.0.0', fetchLatestRelease: sharedFetch })
          )
        )
      );

    const results = await runConcurrent();
    expect(fetchCalls.count).toBe(1);
    expect(results.filter(r => r.noticeEligible).length).toBe(1);
  });
});

describe('check-for-updates bundle', () => {
  beforeAll(() => {
    execFileSync('npx', ['tsc'], { cwd: REPO_ROOT, stdio: 'pipe' });
    execFileSync('npm', ['run', 'build:skills'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  test('parent bundle contains stamped package version', () => {
    const packageVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))
      .version as string;
    const bundlePath = path.join(
      builtSkillDir('st-create-plan'),
      'scripts',
      'check-for-updates.cjs'
    );
    const contents = fs.readFileSync(bundlePath, 'utf8');
    expect(contents).toContain(packageVersion);
    expect(contents).not.toContain('SKILL_RELEASE_VERSION');
  });

  test('st-code-review does not ship check-for-updates.cjs', () => {
    const reviewScript = path.join(
      builtSkillDir('st-code-review'),
      'scripts',
      'check-for-updates.cjs'
    );
    expect(fs.existsSync(reviewScript)).toBe(false);
  });

  test('bundled entry prints one JSON line and exits 0', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-bundle-'));
    try {
      initGitWorkspace(tempDir, { workspaceVersion: '3.21.0', harnesses: ['claude'] });
      const script = path.join(builtSkillDir('st-create-plan'), 'scripts', 'check-for-updates.cjs');
      const result = spawnSync('node', [script], {
        cwd: tempDir,
        encoding: 'utf8',
        env: { ...process.env, NODE_OPTIONS: '' },
      });
      expect(result.status).toBe(0);
      const lines = (result.stdout ?? '').trim().split('\n');
      expect(lines.length).toBe(1);
      const parsed = JSON.parse(lines[0]) as { noticeEligible: boolean };
      expect(typeof parsed.noticeEligible).toBe('boolean');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
