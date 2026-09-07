import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as semver from 'semver';

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
export const STATE_GITIGNORE_RELATIVE = path.join(
  '.ai',
  'strikethroo',
  'runtime',
  'update-check.json'
);

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
  isStatePathGitignored: (projectRoot: string) => boolean;
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
      if (total > MAX_RESPONSE_BYTES) return null;
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const payload = JSON.parse(text) as { tag_name?: unknown };
    if (typeof payload.tag_name !== 'string') return null;
    const stripped = payload.tag_name.replace(/^v/i, '');
    return semver.valid(semver.coerce(stripped) ?? '') ? stripped : null;
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

const defaultIsStatePathGitignored = (projectRoot: string): boolean => {
  try {
    execFileSync('git', ['check-ignore', '-q', STATE_GITIGNORE_RELATIVE], {
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

const isValidState = (state: UpdateCheckState | null): UpdateCheckState =>
  state && typeof state === 'object' ? state : {};

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
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const fd = fs.openSync(lockPath, 'wx');
    const payload: LockPayload = { pid: process.pid, claimedAt: new Date(now()).toISOString() };
    fs.writeFileSync(fd, JSON.stringify(payload));
    fs.closeSync(fd);
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'EEXIST') return false;
    const existing = fs.readFileSync(lockPath, 'utf8');
    const lock = parseLock(existing);
    if (!lock || !isLockStale(lock, now())) return false;
    try {
      fs.unlinkSync(lockPath);
    } catch {
      return false;
    }
    return defaultTryAcquireLock(lockPath, now);
  }
};

const defaultReleaseLock = (lockPath: string): void => {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch {
    // best-effort
  }
};

const defaultWriteTextFile = (filePath: string, contents: string): boolean => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp-${process.pid}`;
    fs.writeFileSync(tempPath, contents);
    fs.renameSync(tempPath, filePath);
    return true;
  } catch {
    return false;
  }
};

export const compareToRelease = (
  localVersion: string | null,
  release: string | null
): VersionDisposition => {
  if (!localVersion || !release) return 'unknown';
  const local = semver.valid(semver.coerce(localVersion) ?? '');
  const remote = semver.valid(semver.coerce(release) ?? '');
  if (!local || !remote) return 'unknown';
  if (semver.lt(local, remote)) return 'outdated';
  if (semver.gt(local, remote)) return 'ahead';
  return 'current';
};

const isNoticeIntervalElapsed = (
  lastNoticeIssuedAt: string | undefined,
  nowMs: number
): boolean => {
  if (!lastNoticeIssuedAt) return true;
  const last = Date.parse(lastNoticeIssuedAt);
  if (Number.isNaN(last)) return true;
  return nowMs - last >= NOTICE_INTERVAL_MS;
};

const isAttemptIntervalElapsed = (lastAttemptAt: string | undefined, nowMs: number): boolean => {
  if (!lastAttemptAt) return true;
  const last = Date.parse(lastAttemptAt);
  if (Number.isNaN(last)) return true;
  return nowMs - last >= ATTEMPT_INTERVAL_MS;
};

const interpolateNoticeTemplate = (template: string, updateCommand: string): string =>
  template.replace(/\{\{updateCommand\}\}/g, updateCommand);

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
    return interpolateNoticeTemplate(BUNDLED_HARNESS_UPDATE_NOTICE, result.updateCommand);
  }
  return interpolateNoticeTemplate(
    readNoticeTemplate(strikethrooRoot, readTextFile),
    result.updateCommand
  );
};

const emptyResult = (skillVersion: string): UpdateCheckResult => ({
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
    const version = typeof metadata.version === 'string' ? metadata.version : null;
    const needsHarnessPrompt =
      !('harnesses' in metadata) || metadata.harnesses === undefined || metadata.harnesses === null;
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
  const { skillVersion } = deps;

  const metadata = readWorkspaceMetadata(strikethrooRoot, deps.readTextFile);
  const workspaceVersion = metadata.version;

  const projectRoot = deps.findProjectRoot(strikethrooRoot);
  if (!projectRoot || !deps.isStatePathGitignored(projectRoot)) {
    return {
      ...emptyResult(skillVersion),
      workspaceVersion,
      needsHarnessPrompt: metadata.needsHarnessPrompt,
      workspaceDisposition: compareToRelease(workspaceVersion, null),
      skillDisposition: compareToRelease(skillVersion, null),
    };
  }

  const statePath = path.join(strikethrooRoot, STATE_RELATIVE_PATH);
  const lockPath = path.join(strikethrooRoot, LOCK_RELATIVE_PATH);
  const state = isValidState(readJsonFile<UpdateCheckState>(statePath));
  const nowMs = deps.now();

  const claimed = deps.tryAcquireLock(lockPath);
  if (!claimed) {
    const latestRelease = state.lastSuccessfulRelease ?? null;
    const workspaceDisposition = compareToRelease(workspaceVersion, latestRelease);
    const skillDisposition = compareToRelease(skillVersion, latestRelease);
    const outdated = workspaceDisposition === 'outdated' || skillDisposition === 'outdated';
    return {
      noticeEligible: false,
      needsHarnessPrompt: metadata.needsHarnessPrompt,
      updateCommand: UPDATE_COMMAND,
      latestRelease,
      workspaceVersion,
      skillVersion,
      workspaceDisposition,
      skillDisposition,
      notice: outdated ? undefined : undefined,
    };
  }

  try {
    let workingState = { ...state };
    let latestRelease = workingState.lastSuccessfulRelease ?? null;

    if (isAttemptIntervalElapsed(workingState.lastAttemptAt, nowMs)) {
      const fetched = await deps.fetchLatestRelease();
      workingState = {
        ...workingState,
        lastAttemptAt: new Date(nowMs).toISOString(),
        lastAttemptFailed: fetched === null,
      };
      if (fetched !== null) {
        workingState.lastSuccessfulRelease = fetched;
        workingState.lastSuccessfulReleaseAt = new Date(nowMs).toISOString();
        latestRelease = fetched;
      }
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return {
          ...emptyResult(skillVersion),
          workspaceVersion,
          needsHarnessPrompt: metadata.needsHarnessPrompt,
        };
      }
    }

    const workspaceDisposition = compareToRelease(workspaceVersion, latestRelease);
    const skillDisposition = compareToRelease(skillVersion, latestRelease);
    const componentOutdated =
      workspaceDisposition === 'outdated' || skillDisposition === 'outdated';
    const noticeEligible =
      componentOutdated && isNoticeIntervalElapsed(workingState.lastNoticeIssuedAt, nowMs);

    if (noticeEligible) {
      workingState = {
        ...workingState,
        lastNoticeIssuedAt: new Date(nowMs).toISOString(),
      };
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return {
          ...emptyResult(skillVersion),
          workspaceVersion,
          needsHarnessPrompt: metadata.needsHarnessPrompt,
          latestRelease,
          workspaceDisposition,
          skillDisposition,
        };
      }
    }

    const base: Omit<UpdateCheckResult, 'notice'> = {
      noticeEligible,
      needsHarnessPrompt: metadata.needsHarnessPrompt,
      updateCommand: UPDATE_COMMAND,
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
