import { execSync } from 'child_process';

export const execGit = (command: string): string | null => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (_error) {
    return null;
  }
};

/**
 * `execGit` for commands whose success case is a non-zero exit. `git diff
 * --no-index` exits 1 when the two paths differ, which is exactly when it has
 * produced the output the caller wants — through `execGit` every such diff would
 * read as a failure. Status 1 returns stdout; anything else stays `null`.
 *
 * Untrimmed on purpose: callers concatenate these into a single diff, where a
 * stripped trailing newline would run one file's last line into the next file's
 * `diff --git` header.
 */
export const execGitDiffAllowingChanges = (command: string): string | null => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    const failure = error as { status?: unknown; stdout?: unknown };
    if (failure.status === 1 && typeof failure.stdout === 'string') return failure.stdout;
    return null;
  }
};
