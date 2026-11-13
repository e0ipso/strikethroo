import { execGit, execGitDiffAllowingChanges, splitNulDelimited } from './git-utils';

const GENERATED_ATTRIBUTES = ['linguist-generated', 'linguist-vendored'] as const;

/**
 * `check-attr` reports `unspecified`, `unset` (`-linguist-generated`), `set`
 * (the bare `out/* linguist-generated`), or the written value. Every other
 * value marks the path, as it does for GitHub's linguist, so the bare form
 * excludes exactly as `=true` does.
 */
const ATTRIBUTE_UNMARKED: ReadonlySet<string> = new Set(['unspecified', 'unset', 'false']);

/**
 * The subset of `files` that `.gitattributes` marks generated or vendored.
 * Paths go to git over stdin, NUL-delimited, so a name is never an argument
 * and the set has no length limit. `null` when the check itself failed; the
 * caller propagates that rather than treating it as "nothing excluded".
 */
const attributeExcluded = (workspace: string, files: readonly string[]): Set<string> | null => {
  const excluded = new Set<string>();
  if (files.length === 0) return excluded;
  const report = execGit(
    ['-C', workspace, 'check-attr', '--stdin', '-z', ...GENERATED_ATTRIBUTES],
    { input: files.map(file => `${file}\0`).join(''), trim: false }
  );
  if (report === null) return null;
  // `-z` output is a flat sequence of `<path>\0<attribute>\0<value>\0` records;
  // a path appears once per attribute asked about.
  const fields = report.split('\0');
  for (let i = 0; i + 2 < fields.length; i += 3) {
    if (!ATTRIBUTE_UNMARKED.has(fields[i + 2]!)) excluded.add(fields[i]!);
  }
  return excluded;
};

/**
 * Changed paths marked generated or vendored. `--no-renames` so `--name-only`
 * lists both sides of a rename; excluding only the destination would leave the
 * source in the diff as a full deletion. `null` when the listing or the
 * attribute check failed.
 */
const excludedPaths = (workspace: string, baseCommit: string): string[] | null => {
  const changed = execGit(
    ['-C', workspace, 'diff', '--no-renames', '--name-only', '-z', baseCommit, '--'],
    { trim: false }
  );
  if (changed === null) return null;
  const excluded = attributeExcluded(workspace, splitNulDelimited(changed));
  return excluded === null ? null : [...excluded];
};

/**
 * Untracked, unignored paths minus generated and vendored ones.
 * `core.quotePath=false`: a quoted non-ASCII name would not resolve in
 * `git diff --no-index`, and the file would silently drop out. `null` when
 * the listing or the attribute check failed.
 */
const untrackedPaths = (workspace: string): string[] | null => {
  const listed = execGit(
    [
      '-c',
      'core.quotePath=false',
      '-C',
      workspace,
      'ls-files',
      '--others',
      '--exclude-standard',
      '-z',
    ],
    { trim: false }
  );
  if (listed === null) return null;
  const files = splitNulDelimited(listed);
  const excluded = attributeExcluded(workspace, files);
  if (excluded === null) return null;
  return files.filter(file => !excluded.has(file));
};

/** Add-diff for one untracked file. `--no-index` numbers the prefixes otherwise. */
const untrackedDiff = (workspace: string, file: string): string | null =>
  execGitDiffAllowingChanges([
    '-C',
    workspace,
    'diff',
    '--no-index',
    '--src-prefix=a/',
    '--dst-prefix=b/',
    '--',
    '/dev/null',
    file,
  ]);

/**
 * Scope: two-dot `git diff <base>` against the working tree, plus an add-diff
 * per untracked unignored path, minus paths `.gitattributes` marks generated
 * or vendored. Why each: `.ai/kenkeep/nodes/code-review/`.
 *
 * Every Git step is argv-based: paths from the repository are data, never part
 * of a command string. Any step failing — the listings, the attribute check,
 * the tracked diff, or any one untracked add-diff — makes the whole read `null`,
 * so the gate reports infrastructure failure instead of reviewing a scope that
 * silently lost a file.
 */
export const readCumulativeDiff = (workspace: string, baseCommit: string): string | null => {
  const excluded = excludedPaths(workspace, baseCommit);
  if (excluded === null) return null;
  const tracked = execGit([
    '-C',
    workspace,
    'diff',
    baseCommit,
    '--',
    '.',
    ...excluded.map(file => `:(exclude,literal)${file}`),
  ]);
  if (tracked === null) return null;
  const untracked = untrackedPaths(workspace);
  if (untracked === null) return null;
  const added: string[] = [];
  for (const file of untracked) {
    const diff = untrackedDiff(workspace, file);
    if (diff === null) return null;
    if (diff.trim() !== '') added.push(diff);
  }
  return [tracked, ...added].filter(part => part.trim() !== '').join('\n');
};
