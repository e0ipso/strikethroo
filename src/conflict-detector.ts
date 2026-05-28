/**
 * File Conflict Detection
 *
 * This file handles detection of user-modified files during init command
 * by comparing current file hashes against stored baseline hashes
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { FileConflict, InitMetadata } from './types';
import { calculateFileHash } from './metadata';

/**
 * Get all config files that should be checked for conflicts
 * @param destDir - Destination directory (.ai/strikethroo)
 * @returns Array of relative paths from destDir
 */
async function getConfigFiles(destDir: string): Promise<string[]> {
  const configDir = path.join(destDir, 'config');
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
    await walkDir(configDir, destDir);
  }

  return files;
}

/**
 * Detect conflicts between user's current files and incoming package files
 * @param destDir - Destination directory (.ai/strikethroo)
 * @param templateDir - Source template directory from package
 * @param metadata - Previously stored metadata with original hashes
 * @returns Array of FileConflict objects for files that have been modified
 */
export async function detectConflicts(
  destDir: string,
  templateDir: string,
  metadata: InitMetadata
): Promise<FileConflict[]> {
  const conflicts: FileConflict[] = [];
  const configFiles = await getConfigFiles(templateDir);

  for (const relativePath of configFiles) {
    const userFilePath = path.join(destDir, relativePath);
    const newFilePath = path.join(templateDir, relativePath);

    // Check if file exists in user's directory
    const userFileExists = await fs.pathExists(userFilePath);
    if (!userFileExists) {
      // File doesn't exist in user's directory, no conflict (new file)
      continue;
    }

    // Get original hash from metadata
    const originalHash = metadata.files[relativePath];
    if (!originalHash) {
      // File wasn't tracked in metadata (new file in this version), no conflict
      continue;
    }

    // Calculate current hash of user's file
    const currentHash = await calculateFileHash(userFilePath);

    // Compare current hash with original hash (NOT with new file hash)
    // This is the CRITICAL distinction: we detect if USER has modified the file
    if (currentHash !== originalHash) {
      // User has modified the file since last init
      const userFileContent = await fs.readFile(userFilePath, 'utf-8');
      const newFileContent = await fs.readFile(newFilePath, 'utf-8');

      conflicts.push({
        relativePath,
        userFileContent,
        newFileContent,
        originalHash,
        currentHash,
      });
    }
  }

  return conflicts;
}

/**
 * Check if a file has been deleted by the user
 * @param destDir - Destination directory (.ai/strikethroo)
 * @param relativePath - Relative path from destDir
 * @param metadata - Previously stored metadata
 * @returns true if file existed in metadata but is now deleted
 */
export function isFileDeleted(
  destDir: string,
  relativePath: string,
  metadata: InitMetadata
): boolean {
  const filePath = path.join(destDir, relativePath);
  const existsInMetadata = relativePath in metadata.files;
  const existsOnDisk = fs.pathExistsSync(filePath);

  return existsInMetadata && !existsOnDisk;
}
