import { execFileSync } from 'child_process';

/**
 * The review scope deliberately has no size cap, but execFileSync's default
 * maxBuffer is 1 MiB — small enough that a legitimate cumulative diff
 * overflows it, and the resulting ENOBUFS is indistinguishable from a git
 * failure once caught. Large enough for any plausible diff; a repository
 * beyond it has `.gitignore` and the generated/vendored markers to shrink
 * the scope declaratively.
 */
const GIT_OUTPUT_LIMIT = 64 * 1024 * 1024;

export interface GitOptions {
  /** Working directory for the child; defaults to the current process's. */
  cwd?: string;
  /** Written to git's stdin, for `--stdin` forms that take a path set. */
  input?: string;
  /**
   * `false` returns stdout byte-for-byte. NUL-delimited (`-z`) listings need
   * this: a trailing `\0` is not whitespace, but a leading one is preceded by
   * the first path, and a path may begin or end with whitespace.
   */
  trim?: boolean;
}

const run = (args: readonly string[], opts: GitOptions): string =>
  execFileSync('git', [...args], {
    cwd: opts.cwd,
    input: opts.input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: GIT_OUTPUT_LIMIT,
  });

/**
 * Run `git` with exact arguments and no shell. Every element of `args` reaches
 * git as one argv entry, so paths, refs and branch names are data, whatever
 * characters they contain. Returns stdout (trimmed unless `trim: false`), or
 * `null` when git exits non-zero or cannot be launched.
 */
export const execGit = (args: readonly string[], opts: GitOptions = {}): string | null => {
  try {
    const out = run(args, opts);
    return opts.trim === false ? out : out.trim();
  } catch {
    return null;
  }
};

/**
 * `execGit` for commands whose success case is a non-zero exit. `git diff
 * --no-index` exits 1 when the two paths differ, which is exactly when it has
 * produced the output the caller wants — through `execGit` every such diff would
 * read as a failure. Status 0 or 1 returns stdout; anything else stays `null`.
 *
 * Untrimmed on purpose: callers concatenate these into a single diff, where a
 * stripped trailing newline would run one file's last line into the next file's
 * `diff --git` header.
 */
export const execGitDiffAllowingChanges = (
  args: readonly string[],
  opts: GitOptions = {}
): string | null => {
  try {
    return run(args, opts);
  } catch (error) {
    const failure = error as { status?: unknown; stdout?: unknown };
    if (failure.status === 1 && typeof failure.stdout === 'string') return failure.stdout;
    return null;
  }
};

/** Split a `-z` listing into its paths, dropping the empty tail after the last `\0`. */
export const splitNulDelimited = (listing: string): string[] =>
  listing.split('\0').filter(entry => entry.length > 0);
