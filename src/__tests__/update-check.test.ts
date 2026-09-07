import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';

import {
  ATTEMPT_INTERVAL_MS,
  checkForUpdates,
  compareToRelease,
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
  const projectRoot = path.dirname(path.dirname(strikethrooRoot));

  const realWrite = (filePath: string, contents: string): boolean => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const temp = `${filePath}.tmp-${process.pid}`;
      fs.writeFileSync(temp, contents);
      fs.renameSync(temp, filePath);
      return true;
    } catch {
      return false;
    }
  };

  const tryAcquireLock = (lockPath: string): boolean => {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, claimedAt: new Date(nowMs).toISOString() })
      );
      fs.closeSync(fd);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'EEXIST') return false;
      try {
        const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as {
          pid: number;
          claimedAt: string;
        };
        const claimedAt = Date.parse(existing.claimedAt);
        if (Number.isNaN(claimedAt) || nowMs - claimedAt < LOCK_STALE_MS) return false;
        fs.unlinkSync(lockPath);
      } catch {
        return false;
      }
      return tryAcquireLock(lockPath);
    }
  };

  const releaseLock = (lockPath: string): void => {
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  };

  return {
    now: () => nowMs,
    skillVersion: overrides.skillVersion ?? '3.0.0',
    fetchLatestRelease: overrides.fetchLatestRelease
      ? overrides.fetchLatestRelease
      : async () => {
          fetchCalls.count += 1;
          return '3.21.0';
        },
    isStatePathGitignored: (root: string) => {
      try {
        execFileSync('git', ['check-ignore', '-q', '.ai/strikethroo/runtime/update-check.json'], {
          cwd: root,
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    },
    findProjectRoot: () => projectRoot,
    readTextFile: (filePath: string) => {
      try {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf8');
      } catch {
        return null;
      }
    },
    writeTextFile: realWrite,
    tryAcquireLock,
    releaseLock,
  };
};

describe('compareToRelease', () => {
  test('orders semver correctly', () => {
    expect(compareToRelease('3.20.0', '3.21.0')).toBe('outdated');
    expect(compareToRelease('3.21.0', '3.21.0')).toBe('current');
    expect(compareToRelease('3.22.0', '3.21.0')).toBe('ahead');
    expect(compareToRelease('not-a-version', '3.21.0')).toBe('unknown');
    expect(compareToRelease('3.21.0', null)).toBe('unknown');
  });
});

describe('checkForUpdates integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-check-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

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
    expect(result.updateCommand).toBe('npx strikethroo@latest update');
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

  test('stale lock allows recovery and notice issuance', async () => {
    const root = initGitWorkspace(tempDir, { workspaceVersion: '3.0.0', harnesses: ['claude'] });
    const lockPath = path.join(root, 'runtime', 'update-check.lock');
    const staleAt = new Date(Date.now() - LOCK_STALE_MS - 1_000).toISOString();
    writeFile(lockPath, JSON.stringify({ pid: 999_999, claimedAt: staleAt }));

    const result = await checkForUpdates(root, makeDeps(root, { skillVersion: '3.0.0' }));
    expect(result.noticeEligible).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(false);
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
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-create-plan',
      'scripts',
      'check-for-updates.cjs'
    );
    const contents = fs.readFileSync(bundlePath, 'utf8');
    expect(contents).toContain(packageVersion);
    expect(contents).not.toContain('SKILL_RELEASE_VERSION');
  });

  test('st-code-review does not ship check-for-updates.cjs', () => {
    const reviewScript = path.join(
      REPO_ROOT,
      'templates',
      'harness',
      'skills',
      'st-code-review',
      'scripts',
      'check-for-updates.cjs'
    );
    expect(fs.existsSync(reviewScript)).toBe(false);
  });

  test('bundled entry prints one JSON line and exits 0', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-bundle-'));
    try {
      initGitWorkspace(tempDir, { workspaceVersion: '3.21.0', harnesses: ['claude'] });
      const script = path.join(
        REPO_ROOT,
        'templates',
        'harness',
        'skills',
        'st-create-plan',
        'scripts',
        'check-for-updates.cjs'
      );
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
