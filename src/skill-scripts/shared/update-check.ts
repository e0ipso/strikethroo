import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import SemVer from 'semver/classes/semver';
import valid from 'semver/functions/valid';
import prerelease from 'semver/functions/prerelease';
import { normalizeSavedHarnesses } from '../../resolve-init-harnesses';
import { writeFileAtomicSync } from './safe-fs';

declare const SKILL_RELEASE_VERSION: string;

/** Bundled skill release version; falls back to package.json in Vitest. */
export const DEFAULT_SKILL_VERSION: string =
  typeof SKILL_RELEASE_VERSION !== 'undefined'
    ? SKILL_RELEASE_VERSION
    : (() => {
        try {
          return require('../../../package.json').version as string;
        } catch {
          return '0.0.0';
        }
      })();

export const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/e0ipso/strikethroo/releases/latest';
export const UPDATE_COMMAND = 'npx strikethroo@latest update';
export const BUNDLED_UPDATE_NOTICE_TEMPLATE =
  'A newer Strikethroo release is available. Run `{{updateCommand}}` to update.';
export const BUNDLED_HARNESS_UPDATE_NOTICE =
  'A newer Strikethroo release is available. Ask the user which harnesses to use, ' +
  'then run `{{updateCommand}}` with `--harnesses <list>`.';
export const UPDATE_NOTICE_TEMPLATE_RELATIVE = path.join(
  'config',
  'templates',
  'UPDATE_NOTICE_TEMPLATE.md'
);
export const REQUEST_TIMEOUT_MS = 2_000;
export const MAX_RESPONSE_BYTES = 65_536;
export const ATTEMPT_INTERVAL_MS = 24 * 60 * 60 * 1_000;
export const NOTICE_INTERVAL_MS = 24 * 60 * 60 * 1_000;
export const LOCK_STALE_MS = 30_000;
export const STATE_RELATIVE_PATH = path.join('runtime', 'update-check.json');
export const LOCK_RELATIVE_PATH = path.join('runtime', 'update-check.lock');

export type VersionDisposition = 'outdated' | 'current' | 'ahead' | 'unknown';

/**
 * JSON stdout contract for `check-for-updates.cjs` (consumed by task 3 prompt work).
 *
 * Stable field names — do not rename without updating consumers.
 */
export interface UpdateCheckResult {
  /** True when a parent may show an update notice this turn. */
  noticeEligible: boolean;
  /** True when metadata lacks saved harnesses; parent should emit an agent prompt. */
  needsHarnessPrompt: boolean;
  /** Locally defined copyable update command (never from release prose). */
  updateCommand: string;
  /** Optional pre-interpolated notice sentence for the parent template. */
  notice?: string;
  /** Latest stable release version from GitHub, or null when unknown. */
  latestRelease: string | null;
  /** Workspace init version from `.init-metadata.json`, or null when absent. */
  workspaceVersion: string | null;
  /** Running skill bundle version (esbuild define). */
  skillVersion: string;
  /** Semver disposition for the workspace component. */
  workspaceDisposition: VersionDisposition;
  /** Semver disposition for the skill component. */
  skillDisposition: VersionDisposition;
}

export interface UpdateCheckState {
  lastAttemptAt?: string;
  lastAttemptFailed?: boolean;
  lastSuccessfulRelease?: string;
  lastSuccessfulReleaseAt?: string;
  lastNoticeIssuedAt?: string;
}

interface LockPayload {
  pid: number;
  claimedAt: string;
}

export interface UpdateCheckDependencies {
  now: () => number;
  skillVersion: string;
  fetchLatestRelease: () => Promise<string | null>;
  isStatePathGitignored: (projectRoot: string, statePath: string) => boolean;
  findProjectRoot: (strikethrooRoot: string) => string | null;
  readTextFile: (filePath: string) => string | null;
  writeTextFile: (filePath: string, contents: string) => boolean;
  tryAcquireLock: (lockPath: string) => boolean;
  releaseLock: (lockPath: string) => void;
}

const defaultFetchLatestRelease = async (): Promise<string | null> => {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'strikethroo-update-check',
      },
    });
    if (!response.ok) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const payload = JSON.parse(text) as {
      tag_name?: unknown;
      prerelease?: unknown;
      draft?: unknown;
    };
    if (payload.prerelease || payload.draft) return null;
    return stableRelease(payload.tag_name);
  } catch {
    return null;
  }
};

const defaultFindProjectRoot = (strikethrooRoot: string): string | null => {
  try {
    const output = execFileSync('git', ['-C', strikethrooRoot, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output || null;
  } catch {
    return null;
  }
};

const defaultIsStatePathGitignored = (projectRoot: string, statePath: string): boolean => {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', statePath], {
      cwd: projectRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = <T>(filePath: string): T | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const parseLock = (raw: string): LockPayload | null => {
  try {
    const parsed = JSON.parse(raw) as LockPayload;
    if (typeof parsed.pid !== 'number' || typeof parsed.claimedAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const isLockStale = (lock: LockPayload, nowMs: number): boolean => {
  const claimedAt = Date.parse(lock.claimedAt);
  if (Number.isNaN(claimedAt)) return true;
  return nowMs - claimedAt >= LOCK_STALE_MS;
};

const defaultTryAcquireLock = (lockPath: string, now: () => number): boolean => {
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    const fd = fs.openSync(lockPath, 'wx');
    try {
      const payload: LockPayload = { pid: process.pid, claimedAt: new Date(now()).toISOString() };
      fs.writeFileSync(fd, JSON.stringify(payload));
    } finally {
      fs.closeSync(fd);
    }
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'EEXIST') return false;
    try {
      const lock = parseLock(fs.readFileSync(lockPath, 'utf8'));
      const stale = lock
        ? isLockStale(lock, now())
        : now() - fs.statSync(lockPath).mtimeMs >= LOCK_STALE_MS;
      if (!stale) return false;
      if (lock && Number.isInteger(lock.pid) && lock.pid > 0) {
        try {
          process.kill(lock.pid, 0);
          return false;
        } catch (error) {
          if ((error as { code?: string }).code !== 'ESRCH') return false;
        }
      }
      fs.unlinkSync(lockPath);
    } catch {
      return false;
    }
    return defaultTryAcquireLock(lockPath, now);
  }
};

const defaultReleaseLock = (lockPath: string): void => {
  try {
    const lock = parseLock(fs.readFileSync(lockPath, 'utf8'));
    if (lock?.pid === process.pid) fs.unlinkSync(lockPath);
  } catch {
    // best-effort
  }
};

const defaultWriteTextFile = (filePath: string, contents: string): boolean => {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    // Exclusive random temp file, fsync, rename; never through a planted link.
    return !('error' in writeFileAtomicSync(dir, path.basename(filePath), contents));
  } catch {
    return false;
  }
};

export const compareToRelease = (
  localVersion: string | null,
  release: string | null
): VersionDisposition => {
  if (!localVersion || !release) return 'unknown';
  const local = valid(localVersion);
  const remote = valid(release);
  if (!local || !remote) return 'unknown';
  const order = new SemVer(local).compare(remote);
  return order < 0 ? 'outdated' : order > 0 ? 'ahead' : 'current';
};

const stableRelease = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const version = valid(value.replace(/^v/i, ''));
  return version && prerelease(version) === null ? version : null;
};

const intervalElapsed = (
  timestamp: string | undefined,
  nowMs: number,
  intervalMs: number
): boolean => {
  const last = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  return Number.isNaN(last) || nowMs - last >= intervalMs;
};

const interpolateNoticeTemplate = (
  template: string,
  result: Omit<UpdateCheckResult, 'notice'>
): string =>
  template.replace(
    /\{\{(updateCommand|latestRelease|workspaceVersion|skillVersion)\}\}/g,
    (_, key: 'updateCommand' | 'latestRelease' | 'workspaceVersion' | 'skillVersion') =>
      result[key] ?? 'unknown'
  );

const readNoticeTemplate = (
  strikethrooRoot: string,
  readTextFile: (filePath: string) => string | null
): string => {
  const workspaceTemplate = readTextFile(
    path.join(strikethrooRoot, UPDATE_NOTICE_TEMPLATE_RELATIVE)
  );
  return workspaceTemplate?.trim() || BUNDLED_UPDATE_NOTICE_TEMPLATE;
};

const buildNotice = (
  strikethrooRoot: string,
  result: Omit<UpdateCheckResult, 'notice'>,
  readTextFile: (filePath: string) => string | null
): string | undefined => {
  if (!result.noticeEligible) return undefined;
  if (result.needsHarnessPrompt) {
    return interpolateNoticeTemplate(BUNDLED_HARNESS_UPDATE_NOTICE, result);
  }
  return interpolateNoticeTemplate(readNoticeTemplate(strikethrooRoot, readTextFile), result);
};

export const emptyUpdateCheckResult = (skillVersion: string): UpdateCheckResult => ({
  noticeEligible: false,
  needsHarnessPrompt: false,
  updateCommand: UPDATE_COMMAND,
  latestRelease: null,
  workspaceVersion: null,
  skillVersion,
  workspaceDisposition: 'unknown',
  skillDisposition: 'unknown',
});

const readWorkspaceMetadata = (
  strikethrooRoot: string,
  readTextFile: (filePath: string) => string | null
): { version: string | null; needsHarnessPrompt: boolean } => {
  const raw = readTextFile(path.join(strikethrooRoot, '.init-metadata.json'));
  if (!raw) return { version: null, needsHarnessPrompt: true };
  try {
    const metadata = JSON.parse(raw) as { version?: unknown; harnesses?: unknown };
    const version = typeof metadata.version === 'string' ? valid(metadata.version) : null;
    const needsHarnessPrompt = !normalizeSavedHarnesses(metadata.harnesses);
    return { version, needsHarnessPrompt };
  } catch {
    return { version: null, needsHarnessPrompt: true };
  }
};

export const createDefaultDependencies = (): UpdateCheckDependencies => {
  const now = () => Date.now();
  return {
    now,
    skillVersion: DEFAULT_SKILL_VERSION,
    fetchLatestRelease: defaultFetchLatestRelease,
    isStatePathGitignored: defaultIsStatePathGitignored,
    findProjectRoot: defaultFindProjectRoot,
    readTextFile: (filePath: string) => {
      try {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf8');
      } catch {
        return null;
      }
    },
    writeTextFile: defaultWriteTextFile,
    tryAcquireLock: (lockPath: string) => defaultTryAcquireLock(lockPath, now),
    releaseLock: defaultReleaseLock,
  };
};

export const checkForUpdates = async (
  strikethrooRoot: string,
  partialDeps: Partial<UpdateCheckDependencies> = {}
): Promise<UpdateCheckResult> => {
  const deps: UpdateCheckDependencies = { ...createDefaultDependencies(), ...partialDeps };
  const skillVersion = valid(deps.skillVersion) ?? 'unknown';

  const metadata = readWorkspaceMetadata(strikethrooRoot, deps.readTextFile);
  const workspaceVersion = metadata.version;
  const unavailable: UpdateCheckResult = {
    ...emptyUpdateCheckResult(skillVersion),
    workspaceVersion,
    needsHarnessPrompt: metadata.needsHarnessPrompt,
  };

  const statePath = path.join(strikethrooRoot, STATE_RELATIVE_PATH);
  const projectRoot = deps.findProjectRoot(strikethrooRoot);
  if (!projectRoot || !deps.isStatePathGitignored(projectRoot, statePath)) {
    return unavailable;
  }

  const lockPath = path.join(strikethrooRoot, LOCK_RELATIVE_PATH);
  const nowMs = deps.now();

  if (!deps.tryAcquireLock(lockPath)) return unavailable;

  try {
    let workingState = readJsonFile<UpdateCheckState>(statePath) ?? {};
    let latestRelease = stableRelease(workingState.lastSuccessfulRelease);

    if (intervalElapsed(workingState.lastAttemptAt, nowMs, ATTEMPT_INTERVAL_MS)) {
      workingState = {
        ...workingState,
        lastAttemptAt: new Date(nowMs).toISOString(),
        lastAttemptFailed: true,
      };
      // Reserve the daily attempt before I/O, including crashes and write failures.
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return unavailable;
      }
      let fetched: string | null = null;
      try {
        fetched = stableRelease(await deps.fetchLatestRelease());
      } catch {
        // The reserved attempt also covers a rejected request.
      }
      workingState.lastAttemptFailed = fetched === null;
      if (fetched !== null) {
        workingState.lastSuccessfulRelease = fetched;
        workingState.lastSuccessfulReleaseAt = new Date(nowMs).toISOString();
        latestRelease = fetched;
      }
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return unavailable;
      }
    }

    const workspaceDisposition = compareToRelease(workspaceVersion, latestRelease);
    const skillDisposition = compareToRelease(skillVersion, latestRelease);
    const componentOutdated =
      workspaceDisposition === 'outdated' || skillDisposition === 'outdated';
    const noticeEligible =
      componentOutdated &&
      intervalElapsed(workingState.lastNoticeIssuedAt, nowMs, NOTICE_INTERVAL_MS);

    if (noticeEligible) {
      workingState = {
        ...workingState,
        lastNoticeIssuedAt: new Date(nowMs).toISOString(),
      };
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return {
          ...unavailable,
          latestRelease,
          workspaceDisposition,
          skillDisposition,
        };
      }
    }

    const base: Omit<UpdateCheckResult, 'notice'> = {
      noticeEligible,
      needsHarnessPrompt: metadata.needsHarnessPrompt,
      updateCommand: `${UPDATE_COMMAND} --destination-directory '${path.resolve(strikethrooRoot, '../..').replace(/'/g, "'\\''")}'`,
      latestRelease,
      workspaceVersion,
      skillVersion,
      workspaceDisposition,
      skillDisposition,
    };

    return {
      ...base,
      notice: buildNotice(strikethrooRoot, base, deps.readTextFile),
    };
  } finally {
    deps.releaseLock(lockPath);
  }
};
