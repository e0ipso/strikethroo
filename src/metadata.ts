/**
 * Metadata Management for Init Command
 *
 * This file handles hash calculation, metadata file operations,
 * and package version tracking for conflict detection
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FileSystemError, InitMetadata } from './types';
import { readContainedFile, writeFileAtomic, SafeFsError } from './skill-scripts/shared/safe-fs';

/**
 * Current workspace schema version baked into this CLI build.
 *
 * Bumped only when the `.ai/strikethroo/` workspace shape changes
 * incompatibly (renamed hook, new required template, restructured directory).
 * Skill bundles read this constant at build time to enforce a runtime
 * schema-mismatch check against the workspace they're invoked against.
 */
export const CURRENT_WORKSPACE_SCHEMA_VERSION = 4;

/**
 * Calculate SHA-256 hash of a file
 * @param filePath - Absolute path to the file
 * @returns SHA-256 hash as hex string
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Refuse a metadata path whose file, or either parent below the project
 * (`.ai/strikethroo` and `.ai`), is a symbolic link.
 *
 * The containment helper canonicalizes its root, so a link at or above the
 * root would be followed silently; those two parents are checked here. The
 * check runs before any read or write so a linked workspace fails before a
 * single template is copied through it. Missing entries are fine: they are
 * what a first-time init looks like.
 */
async function assertMetadataPathUnlinked(metadataPath: string): Promise<void> {
  const workspaceDir = path.dirname(metadataPath);
  const candidates: Array<[string, 'file' | 'directory']> = [
    [path.dirname(workspaceDir), 'directory'],
    [workspaceDir, 'directory'],
    [metadataPath, 'file'],
  ];
  for (const [candidate, kind] of candidates) {
    let stats: fs.Stats;
    try {
      stats = await fs.lstat(candidate);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') return;
      throw new FileSystemError(
        `Cannot inspect ${candidate}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (stats.isSymbolicLink()) {
      throw new FileSystemError(
        `${candidate} is a symbolic link. Strikethroo reads and writes workspace metadata only ` +
          `through regular directories and files, so a link here cannot be trusted. Replace the ` +
          `symbolic link with a regular ${kind} (or remove it) and re-run the command.`
      );
    }
  }
}

function describeRefusal(metadataPath: string, refusal: SafeFsError): string {
  switch (refusal.error) {
    case 'symlink':
      return (
        `${metadataPath} is a symbolic link. Replace it with a regular file (or remove it) ` +
        `and re-run the command.`
      );
    case 'not-a-file':
      return `${metadataPath} is not a regular file. Remove it and re-run the command.`;
    default:
      return `Cannot access ${metadataPath}: ${refusal.message}`;
  }
}

/**
 * Load metadata from .init-metadata.json file
 * @param metadataPath - Absolute path to metadata file
 * @returns InitMetadata object, or null when the file is absent or its JSON is
 *   not usable metadata. The caller decides what null means: a first install
 *   when the workspace holds nothing, an untrusted baseline when it does
 * @throws FileSystemError when the file or a workspace parent is a symbolic
 *   link or otherwise not a regular entry; this is never treated as first-time
 *   init, so a link cannot bypass conflict protection
 */
export async function loadMetadata(metadataPath: string): Promise<InitMetadata | null> {
  await assertMetadataPathUnlinked(metadataPath);

  const read = readContainedFile(path.dirname(metadataPath), path.basename(metadataPath));
  if ('error' in read) {
    if (read.error === 'not-found') return null;
    throw new FileSystemError(describeRefusal(metadataPath, read));
  }

  try {
    const metadata = JSON.parse(read.content) as InitMetadata;

    // Validate metadata structure
    if (!metadata.version || !metadata.timestamp || !metadata.files) {
      return null;
    }

    // Backfill workspaceSchemaVersion for older workspaces missing the field
    if (typeof metadata.workspaceSchemaVersion !== 'number') {
      metadata.workspaceSchemaVersion = 1;
    }

    return metadata;
  } catch {
    // Corrupted or invalid JSON is unusable metadata; the caller decides what that means
    return null;
  }
}

/**
 * Save metadata to .init-metadata.json file
 *
 * Writes atomically through the containment helper with the workspace
 * directory as the root: an exclusive random temp file renamed over the
 * target, never through a link.
 *
 * @param metadataPath - Absolute path to metadata file
 * @param metadata - InitMetadata object to save
 * @throws FileSystemError when the path is a link or the write is refused
 */
export async function saveMetadata(metadataPath: string, metadata: InitMetadata): Promise<void> {
  await assertMetadataPathUnlinked(metadataPath);
  const workspaceDir = path.dirname(metadataPath);
  await fs.ensureDir(workspaceDir);

  const written = await writeFileAtomic(
    workspaceDir,
    path.basename(metadataPath),
    JSON.stringify(metadata, null, 2)
  );
  if ('error' in written) {
    throw new FileSystemError(describeRefusal(metadataPath, written));
  }
}

/**
 * Get the current package version from package.json
 * @returns Version string (e.g., "1.12.0")
 */
export function getPackageVersion(): string {
  // Read package.json from the package root (one level up from dist/)
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = require(packageJsonPath);
  return packageJson.version;
}
