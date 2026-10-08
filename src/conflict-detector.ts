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

/**
 * Detect the incoming paths that need a decision before they are written.
 *
 * A destination is compared against its recorded baseline, not against the
 * incoming file: the question is whether the user changed it. A destination
 * with no recorded hash has nothing to compare against, so it conflicts
 * whenever it differs from the incoming file and carries
 * `NO_RECORDED_BASELINE`. A destination byte-identical to the incoming file is
 * never a conflict, tracked or not; writing it would change nothing.
 *
 * @param destDir - Destination directory (.ai/strikethroo)
 * @param templateDir - Source template directory from package
 * @param baseline - Recorded hashes by relative path; `{}` when no metadata
 *   can be trusted, which makes every existing destination untracked
 */
export async function detectConflicts(
  destDir: string,
  templateDir: string,
  baseline: Record<string, string>
): Promise<FileConflict[]> {
  const conflicts: FileConflict[] = [];

  for (const relativePath of await getConfigFiles(templateDir)) {
    const userFilePath = path.join(destDir, relativePath);
    const newFilePath = path.join(templateDir, relativePath);

    if (!(await fs.pathExists(userFilePath))) continue;

    const currentHash = await calculateFileHash(userFilePath);
    if (currentHash === (await calculateFileHash(newFilePath))) continue;

    const originalHash = baseline[relativePath];
    if (originalHash !== undefined && currentHash === originalHash) continue;

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
