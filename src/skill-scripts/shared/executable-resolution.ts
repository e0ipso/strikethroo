import * as fs from 'fs';
import * as path from 'path';

/**
 * The one answer to "is this an executable we can launch": shared by the
 * dispatch existence check, the readiness cache identity, and the review gate's
 * `xmllint` probe, so the three cannot disagree about what counts.
 *
 * A reference carrying a path separator is tested as that one path. A bare name
 * is looked up in each non-empty `PATH` entry, trying the bare name and then
 * every `PATHEXT` suffix on win32. A candidate counts only when it is a regular
 * file that passes `X_OK`, or `F_OK` on win32 where the execute bit means
 * nothing. The returned path is canonical (`realpath`) because the availability
 * cache keys on it.
 *
 * `src/serve/self-review.ts` keeps its own presence-only scan on purpose; see
 * its module comment.
 */
export interface ExecutableResolutionEnvironment {
  /** Defaults to `process.env`; tests pass a fixture instead of mutating it. */
  env?: Readonly<Record<string, string | undefined>>;
  /** Defaults to `process.platform`; selects the suffix list and permission rule. */
  platform?: typeof process.platform;
}

const DEFAULT_PATHEXT = '.EXE;.CMD;.BAT;.COM';

const hasPathSeparator = (executable: string): boolean => /[\\/]/.test(executable);

/** The resolved canonical path of an executable, or null when it does not resolve. */
export const resolveExecutablePath = (
  executable: string,
  environment: ExecutableResolutionEnvironment = {}
): string | null => {
  const env = environment.env ?? process.env;
  const platform = environment.platform ?? process.platform;
  const win32 = platform === 'win32';
  const suffixes = win32
    ? ['', ...(env.PATHEXT ?? DEFAULT_PATHEXT).split(';').filter(Boolean)]
    : [''];
  const directories = hasPathSeparator(executable)
    ? ['']
    : (env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const mode = win32 ? fs.constants.F_OK : fs.constants.X_OK;
  for (const directory of directories) {
    for (const suffix of suffixes) {
      const candidate = path.resolve(directory, `${executable}${suffix}`);
      try {
        fs.accessSync(candidate, mode);
        if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
      } catch {
        // Not here, or not runnable: try the next suffix or PATH entry.
      }
    }
  }
  return null;
};

/** Convenience predicate over {@link resolveExecutablePath}. */
export const executableResolves = (
  executable: string,
  environment?: ExecutableResolutionEnvironment
): boolean => resolveExecutablePath(executable, environment) !== null;
