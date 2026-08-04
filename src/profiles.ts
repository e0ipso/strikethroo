/**
 * Profile Package Contract
 *
 * Defines the manifest schema (`profile.yaml`) and on-disk surface every
 * profile package — local folder or cloned repository — must satisfy, and
 * validates a package against that contract before any workspace mutation.
 *
 * Validation is side-effect-free: it only reads the package directory.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ProfileError } from './types';

/**
 * Manifest schema version this CLI build understands.
 *
 * Profiles live in external repositories the CLI can never migrate, so a
 * manifest declaring a different version is refused with a message naming
 * both versions and the upgrade direction.
 */
export const PROFILE_MANIFEST_SCHEMA_VERSION = 1;

/**
 * A single entry in a manifest's `requires` or `recommends` list.
 *
 * Strictly informational: printed during import, never probed, executed,
 * or installed.
 */
export interface ProfileRequirement {
  /**
   * What kind of prerequisite this is
   */
  kind: 'skill' | 'tool';
  /**
   * Name of the required skill or tool
   */
  name: string;
  /**
   * Optional human-facing installation hint
   */
  install?: string;
}

/**
 * Parsed `profile.yaml` manifest
 */
export interface ProfileManifest {
  /**
   * Manifest format version (must equal PROFILE_MANIFEST_SCHEMA_VERSION)
   */
  schema_version: number;
  /**
   * Profile identity (kebab-case), echoed at import and recorded in provenance
   */
  name: string;
  /**
   * One-line summary shown during init
   */
  description: string;
  /**
   * Long-form statement of what the profile is tuned for
   */
  purpose?: string;
  /**
   * Free-form discovery/labeling tags
   */
  tags?: string[];
  /**
   * Hard prerequisites without which the profile's hooks/config malfunction
   */
  requires?: ProfileRequirement[];
  /**
   * Soft pairings that complement the profile
   */
  recommends?: ProfileRequirement[];
  /**
   * Attribution
   */
  author?: string;
}

/**
 * Kebab-case: lowercase alphanumeric segments separated by single hyphens
 */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Directories allowed directly under `config/`, each holding only `*.md` files
 */
const ALLOWED_CONFIG_SUBDIRS = ['hooks', 'templates', 'shared'] as const;

/**
 * Files allowed directly under `config/`
 */
const ALLOWED_CONFIG_ROOT_FILES = ['config.yaml', 'STRIKETHROO.md'] as const;

/**
 * Validate a profile package directory against the contract.
 *
 * Checks, in order: `profile.yaml` exists and parses as a YAML mapping, the
 * manifest fields satisfy the schema, and the `config/` surface contains only
 * allowed files. Top-level entries other than `profile.yaml` and `config/`
 * are ignored (a repository may carry `README.md`, `.git`, etc.).
 *
 * @param profileDir - Absolute or relative path to the package root
 * @returns The parsed manifest on success
 * @throws ProfileError naming the offending field or file on any violation
 */
export async function validateProfilePackage(profileDir: string): Promise<ProfileManifest> {
  const manifest = await readManifest(profileDir);
  await validateConfigSurface(profileDir);
  return manifest;
}

/**
 * Read and validate `profile.yaml` from the package root
 * @param profileDir - Path to the package root
 * @returns The validated manifest
 */
async function readManifest(profileDir: string): Promise<ProfileManifest> {
  const manifestPath = path.join(profileDir, 'profile.yaml');

  if (!(await fs.pathExists(manifestPath))) {
    throw new ProfileError(
      `Profile manifest not found: expected profile.yaml at the package root (${profileDir})`
    );
  }

  let rawContent: string;
  try {
    rawContent = await fs.readFile(manifestPath, 'utf-8');
  } catch (error) {
    throw new ProfileError(
      `Failed to read profile.yaml in ${profileDir}: ${formatCause(error)}`,
      error
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(rawContent);
  } catch (error) {
    throw new ProfileError(
      `Failed to parse profile.yaml in ${profileDir} as YAML: ${formatCause(error)}`,
      error
    );
  }

  if (!isPlainObject(parsed)) {
    throw new ProfileError(
      `Invalid profile.yaml in ${profileDir}: expected a YAML mapping of manifest fields, ` +
        `got ${describeType(parsed)}`
    );
  }

  return validateManifestFields(parsed);
}

/**
 * Validate the parsed manifest mapping field by field
 * @param data - Parsed YAML mapping
 * @returns The validated manifest
 */
function validateManifestFields(data: Record<string, unknown>): ProfileManifest {
  const schemaVersion = data.schema_version;
  if (schemaVersion === undefined || schemaVersion === null) {
    throw new ProfileError(
      "Invalid profile.yaml: required field 'schema_version' is missing " +
        `(this CLI supports schema v${PROFILE_MANIFEST_SCHEMA_VERSION})`
    );
  }
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    throw new ProfileError(
      `Invalid profile.yaml: field 'schema_version' must be an integer, got ${describeType(
        schemaVersion
      )}`
    );
  }
  if (schemaVersion !== PROFILE_MANIFEST_SCHEMA_VERSION) {
    if (schemaVersion > PROFILE_MANIFEST_SCHEMA_VERSION) {
      throw new ProfileError(
        `Profile manifest schema v${schemaVersion} is newer than this CLI supports ` +
          `(v${PROFILE_MANIFEST_SCHEMA_VERSION}). Update the strikethroo CLI to import this profile.`
      );
    }
    throw new ProfileError(
      `Profile manifest schema v${schemaVersion} is older than this CLI supports ` +
        `(v${PROFILE_MANIFEST_SCHEMA_VERSION}). Update the profile to manifest schema ` +
        `v${PROFILE_MANIFEST_SCHEMA_VERSION}.`
    );
  }

  const name = data.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw new ProfileError(
      "Invalid profile.yaml: required field 'name' must be a non-empty string, " +
        `got ${describeType(name)}`
    );
  }
  if (!KEBAB_CASE_PATTERN.test(name)) {
    throw new ProfileError(
      `Invalid profile.yaml: field 'name' must be kebab-case ` +
        `(lowercase letters, digits, and single hyphens), got '${name}'`
    );
  }

  const description = data.description;
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new ProfileError(
      "Invalid profile.yaml: required field 'description' must be a non-empty string, " +
        `got ${describeType(description)}`
    );
  }

  const manifest: ProfileManifest = {
    schema_version: schemaVersion,
    name,
    description,
  };

  const purpose = validateOptionalString(data, 'purpose');
  if (purpose !== undefined) {
    manifest.purpose = purpose;
  }

  const author = validateOptionalString(data, 'author');
  if (author !== undefined) {
    manifest.author = author;
  }

  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags)) {
      throw new ProfileError(
        `Invalid profile.yaml: field 'tags' must be a list of strings, got ${describeType(
          data.tags
        )}`
      );
    }
    for (const [index, tag] of data.tags.entries()) {
      if (typeof tag !== 'string') {
        throw new ProfileError(
          `Invalid profile.yaml: field 'tags[${index}]' must be a string, got ${describeType(tag)}`
        );
      }
    }
    manifest.tags = data.tags as string[];
  }

  const requires = validateRequirementList(data, 'requires');
  if (requires !== undefined) {
    manifest.requires = requires;
  }

  const recommends = validateRequirementList(data, 'recommends');
  if (recommends !== undefined) {
    manifest.recommends = recommends;
  }

  return manifest;
}

/**
 * Validate an optional string field on the manifest mapping
 * @param data - Parsed YAML mapping
 * @param field - Field name to check
 * @returns The string value, or undefined when the field is absent
 */
function validateOptionalString(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ProfileError(
      `Invalid profile.yaml: field '${field}' must be a string, got ${describeType(value)}`
    );
  }
  return value;
}

/**
 * Validate an optional `requires`/`recommends` list on the manifest mapping
 * @param data - Parsed YAML mapping
 * @param field - Either 'requires' or 'recommends'
 * @returns The validated entries, or undefined when the field is absent
 */
function validateRequirementList(
  data: Record<string, unknown>,
  field: 'requires' | 'recommends'
): ProfileRequirement[] | undefined {
  const value = data[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ProfileError(
      `Invalid profile.yaml: field '${field}' must be a list of {kind, name, install?} entries, ` +
        `got ${describeType(value)}`
    );
  }

  return value.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new ProfileError(
        `Invalid profile.yaml: field '${field}[${index}]' must be a mapping with 'kind' and ` +
          `'name', got ${describeType(entry)}`
      );
    }
    const kind = entry.kind;
    if (kind !== 'skill' && kind !== 'tool') {
      throw new ProfileError(
        `Invalid profile.yaml: field '${field}[${index}].kind' must be 'skill' or 'tool', ` +
          `got ${describeType(kind)}`
      );
    }
    const name = entry.name;
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ProfileError(
        `Invalid profile.yaml: field '${field}[${index}].name' must be a non-empty string, ` +
          `got ${describeType(name)}`
      );
    }
    const requirement: ProfileRequirement = { kind, name };
    const install = entry.install;
    if (install !== undefined && install !== null) {
      if (typeof install !== 'string') {
        throw new ProfileError(
          `Invalid profile.yaml: field '${field}[${index}].install' must be a string, ` +
            `got ${describeType(install)}`
        );
      }
      requirement.install = install;
    }
    return requirement;
  });
}

/**
 * Validate the package's `config/` surface against the allowlist.
 *
 * Allowed contents, relative to `config/`: `hooks/<name>.md`,
 * `templates/<name>.md`, `shared/<name>.md`, `config.yaml`, `STRIKETHROO.md`.
 * Everything else — dotfiles, `schemas/`, unexpected directories or
 * extensions, traversal-shaped names — is rejected. No partial acceptance.
 *
 * @param profileDir - Path to the package root
 */
async function validateConfigSurface(profileDir: string): Promise<void> {
  const configDir = path.join(profileDir, 'config');

  if (!(await fs.pathExists(configDir))) {
    throw new ProfileError(
      `Profile package is missing its config/ directory: expected ${configDir}`
    );
  }
  const configStat = await fs.stat(configDir);
  if (!configStat.isDirectory()) {
    throw new ProfileError(`Profile package config/ must be a directory: ${configDir}`);
  }

  const rootEntries = await readEntries(configDir);
  for (const entry of rootEntries) {
    rejectUnsafeSegment(entry.name, entry.name);

    if (entry.isFile()) {
      if (!(ALLOWED_CONFIG_ROOT_FILES as readonly string[]).includes(entry.name)) {
        throw new ProfileError(
          `Profile package contains a file outside the allowed config surface: ` +
            `config/${entry.name} (allowed at config/ root: ` +
            `${ALLOWED_CONFIG_ROOT_FILES.join(', ')})`
        );
      }
      continue;
    }

    if (entry.isDirectory()) {
      if (!(ALLOWED_CONFIG_SUBDIRS as readonly string[]).includes(entry.name)) {
        throw new ProfileError(
          `Profile package contains a directory outside the allowed config surface: ` +
            `config/${entry.name}/ (allowed directories: ` +
            `${ALLOWED_CONFIG_SUBDIRS.join(', ')})`
        );
      }
      await validateMarkdownOnlyDir(path.join(configDir, entry.name), entry.name);
      continue;
    }

    throw new ProfileError(
      `Profile package contains an unsupported entry (not a regular file or directory): ` +
        `config/${entry.name}`
    );
  }
}

/**
 * Validate that a config subdirectory contains only flat `*.md` files
 * @param dirPath - Absolute path to the subdirectory
 * @param relDir - Path of the subdirectory relative to `config/`
 */
async function validateMarkdownOnlyDir(dirPath: string, relDir: string): Promise<void> {
  const entries = await readEntries(dirPath);
  for (const entry of entries) {
    const relPath = `${relDir}/${entry.name}`;
    rejectUnsafeSegment(entry.name, relPath);

    if (entry.isDirectory()) {
      throw new ProfileError(
        `Profile package contains a nested directory outside the allowed config surface: ` +
          `config/${relPath}/ (config/${relDir}/ may only contain .md files)`
      );
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      throw new ProfileError(
        `Profile package contains a file outside the allowed config surface: ` +
          `config/${relPath} (config/${relDir}/ may only contain .md files)`
      );
    }
  }
}

/**
 * Read directory entries, wrapping filesystem failures in ProfileError
 * @param dirPath - Absolute path to the directory
 * @returns Directory entries with type information
 */
async function readEntries(dirPath: string): Promise<fs.Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    throw new ProfileError(
      `Failed to read profile package directory ${dirPath}: ${formatCause(error)}`,
      error
    );
  }
}

/**
 * Reject dotfile, traversal, and separator-bearing entry names
 * @param segment - Single directory entry name
 * @param relPath - Path relative to `config/` for error reporting
 */
function rejectUnsafeSegment(segment: string, relPath: string): void {
  if (segment === '..' || segment === '.') {
    throw new ProfileError(
      `Profile package contains a path-traversal entry name in its config surface: ` +
        `config/${relPath}`
    );
  }
  if (segment.includes('/') || segment.includes('\\') || segment.includes('\0')) {
    throw new ProfileError(
      `Profile package contains an entry name with a path separator in its config surface: ` +
        `config/${relPath}`
    );
  }
  if (segment.startsWith('.')) {
    throw new ProfileError(
      `Profile package contains a dotfile inside its config surface: config/${relPath}`
    );
  }
}

/**
 * Type guard for a plain object (YAML mapping)
 * @param value - Value to check
 * @returns True when the value is a non-null, non-array object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Describe a value's type for error messages
 * @param value - Value to describe
 * @returns Human-readable type description
 */
function describeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'missing';
  }
  if (Array.isArray(value)) {
    return 'a list';
  }
  return `${typeof value} (${JSON.stringify(value)})`;
}

/**
 * Extract a readable message from an unknown thrown value
 * @param error - Caught value
 * @returns The error message, or a string rendering of the value
 */
function formatCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
