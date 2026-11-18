/**
 * File Conflict Detection
 *
 * This file handles detection of user-modified files during init command
 * by comparing current file hashes against stored baseline hashes
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { FileConflict } from './types';
import { calculateFileHash } from './metadata';

/**
 * List every file under `<rootDir>/config/`, relative to `rootDir`, sorted.
 *
 * Shared by conflict detection and the refresh pass in `src/index.ts` so both
 * walk the same incoming paths in the same order.
 *
 * @param rootDir - Workspace or template root holding a `config/` tree
 */
export async function getConfigFiles(rootDir: string): Promise<string[]> {
  const configDir = path.join(rootDir, 'config');
  const files: string[] = [];

  async function walkDir(dir: string, relativeTo: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeTo, fullPath);

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativeTo);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  if (await fs.pathExists(configDir)) {
    await walkDir(configDir, rootDir);
  }

  return files.sort();
}

/**
 * `FileConflict.originalHash` for a destination with no recorded baseline.
 *
 * The prompt keys its wording on it: such a file is reported as untracked,
 * never as modified since a baseline Strikethroo does not have.
 */
export const NO_RECORDED_BASELINE = '';

/** What a refresh does with one incoming file. */
export type RefreshKind = 'installed' | 'refreshed' | 'kept' | 'overwritten' | 'unchanged';

/** The hashes a refresh compares for one incoming file. */
export interface RefreshState {
  /** Hash of the destination, or `undefined` when it does not exist. */
  currentHash: string | undefined;
  incomingHash: string;
  /** Hash recorded by the previous refresh, or `undefined` when untracked. */
  recordedHash: string | undefined;
  /**
   * When true, a destination that matches its recorded hash is not replaced
   * silently. Set for a file an imported profile supplied, on a refresh that
   * does not import that profile again: the recorded hash is the profile's
   * version, so a match means "the profile's file", not "an unedited default".
   */
  protectedBaseline?: boolean;
}

/**
 * Whether replacing the destination needs the user's decision.
 *
 * A destination that is absent or byte-identical to the incoming file never
 * does. Otherwise it does when there is no recorded hash, when it diverged
 * from the recorded hash (the user changed it), or when its baseline is
 * protected.
 */
export function needsDecision(state: RefreshState): boolean {
  const { currentHash, incomingHash, recordedHash } = state;
  if (currentHash === undefined || currentHash === incomingHash) return false;
  return (
    state.protectedBaseline === true || recordedHash === undefined || currentHash !== recordedHash
  );
}

/**
 * Classify one incoming file and give the hash the metadata records for it.
 *
 * Every kind except `kept` leaves the incoming bytes on disk, so it records
 * the incoming hash. `kept` records the previous hash, or nothing when there
 * was none: recording the kept file's own hash would make the user's edit the
 * baseline, and the next refresh would replace it without asking.
 *
 * @param overwrite - `--force`, or an explicit overwrite answer for this path;
 *   always false under `--ignore`
 */
export function classifyRefresh(
  state: RefreshState,
  overwrite: boolean
): { kind: RefreshKind; hash: string | undefined } {
  if (state.currentHash === undefined) return { kind: 'installed', hash: state.incomingHash };
  if (state.currentHash === state.incomingHash) {
    return { kind: 'unchanged', hash: state.incomingHash };
  }
  if (!needsDecision(state)) return { kind: 'refreshed', hash: state.incomingHash };
  if (overwrite) return { kind: 'overwritten', hash: state.incomingHash };
  return { kind: 'kept', hash: state.recordedHash };
}

/**
 * Detect the incoming `config/` paths that need a decision before they are
 * written (see {@link needsDecision}).
 *
 * A destination is compared against its recorded baseline, not against the
 * incoming file: the question is whether the user changed it. A destination
 * with no recorded hash carries `NO_RECORDED_BASELINE`.
 *
 * @param destDir - Destination directory (.ai/strikethroo)
 * @param templateDir - Source template directory from package
 * @param baseline - Recorded hashes by relative path; `{}` when no metadata
 *   can be trusted, which makes every existing destination untracked
 * @param protectedPaths - Paths whose baseline match is not a silent refresh
 */
export async function detectConflicts(
  destDir: string,
  templateDir: string,
  baseline: Record<string, string>,
  protectedPaths: ReadonlySet<string> = new Set()
): Promise<FileConflict[]> {
  const conflicts: FileConflict[] = [];

  for (const relativePath of await getConfigFiles(templateDir)) {
    const userFilePath = path.join(destDir, relativePath);
    const newFilePath = path.join(templateDir, relativePath);

    if (!(await fs.pathExists(userFilePath))) continue;

    const currentHash = await calculateFileHash(userFilePath);
    const originalHash = baseline[relativePath];
    const state: RefreshState = {
      currentHash,
      incomingHash: await calculateFileHash(newFilePath),
      recordedHash: originalHash,
      protectedBaseline: protectedPaths.has(relativePath),
    };
    if (!needsDecision(state)) continue;

    conflicts.push({
      relativePath,
      userFileContent: await fs.readFile(userFilePath, 'utf-8'),
      newFileContent: await fs.readFile(newFilePath, 'utf-8'),
      originalHash: originalHash ?? NO_RECORDED_BASELINE,
      currentHash,
    });
  }

  return conflicts;
}
