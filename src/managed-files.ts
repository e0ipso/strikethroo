/**
 * Managed Files
 *
 * Files Strikethroo writes outside `.ai/strikethroo/config/`: the harness agent
 * files and the workspace `.gitignore`. Their hashes live in the metadata
 * `managedFiles` map, keyed by project-relative path, so a refresh can tell an
 * unedited file from a local change.
 *
 * Every read and write goes through the containment helpers: a symbolic link
 * at the file or at any parent below the project is refused, never followed.
 */

import * as crypto from 'crypto';
import * as path from 'path';
import { FileConflict, FileSystemError } from './types';
import {
  ensureContainedDirectory,
  readContainedFile,
  writeFileAtomic,
} from './skill-scripts/shared/safe-fs';
import {
  classifyRefresh,
  needsDecision,
  NO_RECORDED_BASELINE,
  RefreshKind,
  RefreshState,
} from './conflict-detector';

/** One file Strikethroo writes, by path relative to the project root. */
export interface ManagedFile {
  relativePath: string;
  content: string;
}

/** What a refresh did with one managed file, and the hash it records. */
export interface ManagedOutcome {
  relativePath: string;
  kind: RefreshKind;
  hash: string | undefined;
}

/** SHA-256 of the UTF-8 bytes of `content`, as hex. */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Read a managed file below `projectRoot`.
 *
 * @returns The content, or `undefined` when the file or a parent is missing
 * @throws FileSystemError when the path is a link, not a regular file, or
 *   cannot be read; a refresh must stop before it writes anything
 */
export function readManagedFile(projectRoot: string, relativePath: string): string | undefined {
  const read = readContainedFile(projectRoot, relativePath);
  if (!('error' in read)) return read.content;
  if (read.error === 'not-found') return undefined;
  const reason =
    read.error === 'symlink'
      ? 'it or a parent directory is a symbolic link, which cannot be trusted.'
      : read.message;
  throw new FileSystemError(
    `Cannot refresh ${relativePath}: ${reason} Replace it with a regular file or directory and ` +
      're-run the command.'
  );
}

/** The comparison state of one managed file against its recorded hash. */
function stateOf(
  current: string | undefined,
  file: ManagedFile,
  recordedHash: string | undefined
): RefreshState {
  return {
    currentHash: current === undefined ? undefined : hashContent(current),
    incomingHash: hashContent(file.content),
    recordedHash,
  };
}

/**
 * List the managed files that need a decision before they are replaced.
 *
 * @param baseline - Recorded hashes by project-relative path; `{}` when the
 *   workspace has none, which makes every differing file untracked
 */
export function detectManagedConflicts(
  projectRoot: string,
  files: ManagedFile[],
  baseline: Record<string, string>
): FileConflict[] {
  const conflicts: FileConflict[] = [];
  for (const file of files) {
    const current = readManagedFile(projectRoot, file.relativePath);
    const state = stateOf(current, file, baseline[file.relativePath]);
    if (current === undefined || !needsDecision(state)) continue;
    conflicts.push({
      relativePath: file.relativePath,
      userFileContent: current,
      newFileContent: file.content,
      originalHash: state.recordedHash ?? NO_RECORDED_BASELINE,
      currentHash: state.currentHash as string,
    });
  }
  return conflicts;
}

/**
 * Write one managed file atomically, creating its parent directories.
 *
 * @throws FileSystemError when a directory or the file is a link
 */
export async function writeManagedFile(projectRoot: string, file: ManagedFile): Promise<void> {
  const target = path.join(projectRoot, file.relativePath);
  const ensured = ensureContainedDirectory(projectRoot, path.dirname(target));
  if ('error' in ensured) {
    throw new FileSystemError(`Cannot write ${file.relativePath}: ${ensured.message}`);
  }
  const written = await writeFileAtomic(projectRoot, target, file.content, { mode: 0o644 });
  if ('error' in written) {
    throw new FileSystemError(`Cannot write ${file.relativePath}: ${written.message}`);
  }
}

/**
 * Apply one outcome per managed file: install, refresh, overwrite, or keep.
 *
 * @param overwrite - Whether the user authorized replacing this path
 *   (`--force` or an explicit overwrite answer)
 */
export async function refreshManagedFiles(
  projectRoot: string,
  files: ManagedFile[],
  baseline: Record<string, string>,
  overwrite: (relativePath: string) => boolean
): Promise<ManagedOutcome[]> {
  const outcomes: ManagedOutcome[] = [];
  for (const file of files) {
    const current = readManagedFile(projectRoot, file.relativePath);
    const state = stateOf(current, file, baseline[file.relativePath]);
    const outcome = classifyRefresh(state, overwrite(file.relativePath));
    if (outcome.kind !== 'kept' && outcome.kind !== 'unchanged') {
      await writeManagedFile(projectRoot, file);
    }
    outcomes.push({ relativePath: file.relativePath, ...outcome });
  }
  return outcomes;
}

/**
 * Write a managed file that must always carry the incoming version.
 *
 * Returns the local content it replaced when that content had changes of its
 * own (no recorded hash, or diverged from it), so the caller can show what was
 * lost. Returns `undefined` when nothing local was lost.
 */
export async function replaceManagedFile(
  projectRoot: string,
  file: ManagedFile,
  recordedHash: string | undefined
): Promise<string | undefined> {
  const current = readManagedFile(projectRoot, file.relativePath);
  const state = stateOf(current, file, recordedHash);
  if (state.currentHash !== state.incomingHash) {
    await writeManagedFile(projectRoot, file);
  }
  return needsDecision(state) ? current : undefined;
}
