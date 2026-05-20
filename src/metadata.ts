/**
 * Metadata Management for Init Command
 *
 * This file handles hash calculation, metadata file operations,
 * and package version tracking for conflict detection
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { InitMetadata } from './types';

/**
 * Current workspace schema version baked into this CLI build.
 *
 * Bumped only when the `.ai/task-manager/` workspace shape changes
 * incompatibly (renamed hook, new required template, restructured directory).
 * Skill bundles read this constant at build time to enforce a runtime
 * schema-mismatch check against the workspace they're invoked against.
 */
export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1;

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
 * Load metadata from .init-metadata.json file
 * @param metadataPath - Absolute path to metadata file
 * @returns InitMetadata object or null if file doesn't exist or is invalid
 */
export async function loadMetadata(metadataPath: string): Promise<InitMetadata | null> {
  try {
    const exists = await fs.pathExists(metadataPath);
    if (!exists) {
      return null;
    }

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content) as InitMetadata;

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
    // If metadata is corrupted or invalid, return null
    // This treats the situation as first-time init
    return null;
  }
}

/**
 * Save metadata to .init-metadata.json file
 * @param metadataPath - Absolute path to metadata file
 * @param metadata - InitMetadata object to save
 */
export async function saveMetadata(metadataPath: string, metadata: InitMetadata): Promise<void> {
  await fs.ensureDir(path.dirname(metadataPath));
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
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
