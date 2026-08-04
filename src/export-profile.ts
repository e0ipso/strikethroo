/**
 * Export Profile Command
 *
 * Packages the current workspace's configuration surface as a strikethroo
 * profile: copies `config/` (minus the CLI-owned `schemas/` subtree) into the
 * destination and writes a `profile.yaml` manifest collected interactively,
 * or supplied programmatically for non-interactive use.
 *
 * The produced package is validated with `validateProfilePackage` before
 * success is reported, so an export can never emit a package that would fail
 * to round-trip through `init --profile <dir>`.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CommandResult, ProfileError } from './types';
import {
  ProfileManifest,
  ProfileRequirement,
  PROFILE_MANIFEST_SCHEMA_VERSION,
  validateProfilePackage,
} from './profiles';
import { resolveWorkspaceRoot, isResolveError } from './serve/root';

const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

/**
 * Kebab-case: lowercase alphanumeric segments separated by single hyphens.
 * Mirrors the manifest contract enforced by `validateProfilePackage`.
 */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Manifest fields collected from the user; `schema_version` is stamped by the
 * export itself
 */
export type ProfileManifestAnswers = Omit<ProfileManifest, 'schema_version'>;

/**
 * Options for the export profile command
 */
export interface ExportProfileOptions {
  /**
   * Directory to write the profile package into. Must be missing or empty.
   */
  destinationDirectory: string;
  /**
   * Pre-answered manifest fields for non-interactive use. When absent, the
   * command prompts interactively for every field.
   */
  manifest?: ProfileManifestAnswers;
  /**
   * Directory to start workspace-root discovery from (default: process.cwd())
   */
  cwd?: string;
}

/**
 * Format a section header with cyan styling
 * @param title - Header title text
 * @returns Styled header string
 */
function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}

/**
 * Export the current workspace's configuration as a strikethroo profile.
 *
 * Steps: resolve the workspace root by walking up from `cwd`, refuse a
 * non-empty destination before any write, collect the manifest (prompting
 * unless pre-answered), copy `config/` minus `schemas/`, write
 * `profile.yaml`, and validate the produced package as a final self-check.
 *
 * @param options - Destination directory plus optional pre-answered manifest
 * @returns Command result describing success or failure
 */
export async function exportProfile(options: ExportProfileOptions): Promise<CommandResult> {
  try {
    const resolved = resolveWorkspaceRoot({ cwd: options.cwd });
    if (isResolveError(resolved)) {
      throw new ProfileError(`Cannot export a strikethroo profile: ${resolved.error}`);
    }
    const workspaceConfigDir = path.join(resolved.root, 'config');
    if (!(await fs.pathExists(workspaceConfigDir))) {
      throw new ProfileError(
        `Cannot export a strikethroo profile: workspace has no config/ directory ` +
          `(expected ${workspaceConfigDir}). Re-run \`npx strikethroo init\` to restore it.`
      );
    }

    const destination = path.resolve(options.destinationDirectory);
    await assertDestinationUsable(destination);

    console.log(chalk.bold.white('\nStrikethroo Profile Export'));
    console.log(chalk.gray(DIVIDER));
    console.log(formatSectionHeader('Configuration'));
    console.log(`  ${chalk.cyan('●')} Workspace: ${resolved.root}`);
    console.log(`  ${chalk.cyan('●')} Destination: ${destination}`);

    const answers = options.manifest ?? (await promptForManifest());
    const manifest = buildManifest(answers);

    console.log(formatSectionHeader('Export Progress'));

    await fs.ensureDir(destination);
    await copyConfigSurface(workspaceConfigDir, path.join(destination, 'config'));
    console.log(`  ${chalk.green('✓')} Copied config/ (schemas/ excluded — CLI-owned)`);

    await fs.writeFile(path.join(destination, 'profile.yaml'), yaml.dump(manifest), 'utf-8');
    console.log(`  ${chalk.green('✓')} Wrote profile.yaml (schema v${manifest.schema_version})`);

    // Final self-check: the exported package must satisfy the same contract
    // `init --profile <dir>` validates against.
    await validateProfilePackage(destination);
    console.log(`  ${chalk.green('✓')} Validated package against the profile contract`);

    console.log(
      `\n${chalk.green('✓')} strikethroo profile '${manifest.name}' exported to ${destination}\n`
    );
    console.log(
      chalk.gray(
        '  Publish it by pushing the folder to a git host, or import it directly with\n' +
          `  \`npx strikethroo init --harnesses <list> --profile ${destination}\`.\n`
      )
    );

    return {
      success: true,
      message: `strikethroo profile '${manifest.name}' exported to ${destination}`,
      data: { destination, name: manifest.name },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Profile export failed with unknown error';
    console.error(chalk.red(`\n✗ Profile export failed: ${message}\n`));
    return {
      success: false,
      message,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Refuse a destination that already exists and is non-empty.
 *
 * Runs before any write so a refused export never mutates the destination.
 *
 * @param destination - Absolute destination path
 */
async function assertDestinationUsable(destination: string): Promise<void> {
  if (!(await fs.pathExists(destination))) {
    return;
  }
  const stat = await fs.stat(destination);
  if (!stat.isDirectory()) {
    throw new ProfileError(
      `Refusing to overwrite existing file at destination: ${destination} ` +
        `(--destination-directory must be a missing or empty directory)`
    );
  }
  const entries = await fs.readdir(destination);
  if (entries.length > 0) {
    throw new ProfileError(
      `Refusing to overwrite non-empty destination: ${destination} already contains ` +
        `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}. ` +
        `Choose a missing or empty directory for the exported strikethroo profile.`
    );
  }
}

/**
 * Copy the workspace `config/` tree into the package, excluding `schemas/`.
 *
 * The full surface is exported verbatim — not a diff against shipped
 * defaults — so the package is self-describing.
 *
 * @param sourceConfigDir - Workspace `config/` directory
 * @param destConfigDir - Package `config/` directory
 */
async function copyConfigSurface(sourceConfigDir: string, destConfigDir: string): Promise<void> {
  await fs.copy(sourceConfigDir, destConfigDir, {
    filter: src => {
      const rel = path.relative(sourceConfigDir, src);
      return rel !== 'schemas' && !rel.startsWith(`schemas${path.sep}`);
    },
  });
}

/**
 * Assemble the manifest, stamping the schema version and omitting empty
 * optional fields so the emitted YAML stays minimal
 *
 * @param answers - Collected manifest fields
 * @returns Complete manifest ready for serialization
 */
function buildManifest(answers: ProfileManifestAnswers): ProfileManifest {
  const manifest: ProfileManifest = {
    schema_version: PROFILE_MANIFEST_SCHEMA_VERSION,
    name: answers.name,
    description: answers.description,
  };
  if (answers.purpose && answers.purpose.trim().length > 0) {
    manifest.purpose = answers.purpose;
  }
  if (answers.tags && answers.tags.length > 0) {
    manifest.tags = answers.tags;
  }
  if (answers.requires && answers.requires.length > 0) {
    manifest.requires = answers.requires;
  }
  if (answers.recommends && answers.recommends.length > 0) {
    manifest.recommends = answers.recommends;
  }
  if (answers.author && answers.author.trim().length > 0) {
    manifest.author = answers.author;
  }
  return manifest;
}

/**
 * Interactively collect every manifest field
 * @returns Collected manifest fields
 */
async function promptForManifest(): Promise<ProfileManifestAnswers> {
  console.log(formatSectionHeader('Profile Manifest'));

  const identity = await inquirer.prompt<{
    name: string;
    description: string;
    purpose: string;
    tags: string;
    author: string;
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Profile name (kebab-case):',
      validate: (value: string) =>
        KEBAB_CASE_PATTERN.test(value.trim()) ||
        'Name must be kebab-case: lowercase letters, digits, and single hyphens (e.g. drupal-kenkeep)',
      filter: (value: string) => value.trim(),
    },
    {
      type: 'input',
      name: 'description',
      message: 'One-line description:',
      validate: (value: string) => value.trim().length > 0 || 'Description is required',
      filter: (value: string) => value.trim(),
    },
    {
      type: 'input',
      name: 'purpose',
      message: 'Purpose (long-form, optional):',
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, optional):',
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author (optional):',
    },
  ]);

  const requires = await promptForRequirements('required');
  const recommends = await promptForRequirements('recommended');

  const answers: ProfileManifestAnswers = {
    name: identity.name,
    description: identity.description,
  };
  if (identity.purpose.trim().length > 0) {
    answers.purpose = identity.purpose.trim();
  }
  const tags = identity.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  if (tags.length > 0) {
    answers.tags = tags;
  }
  if (requires.length > 0) {
    answers.requires = requires;
  }
  if (recommends.length > 0) {
    answers.recommends = recommends;
  }
  if (identity.author.trim().length > 0) {
    answers.author = identity.author.trim();
  }
  return answers;
}

/**
 * Collect zero or more requirement entries via a confirm-then-fields loop
 * @param label - 'required' or 'recommended', used in prompt copy
 * @returns Collected requirement entries
 */
async function promptForRequirements(
  label: 'required' | 'recommended'
): Promise<ProfileRequirement[]> {
  const entries: ProfileRequirement[] = [];
  for (;;) {
    const { add } = await inquirer.prompt<{ add: boolean }>([
      {
        type: 'confirm',
        name: 'add',
        message:
          entries.length === 0
            ? `Add a ${label} skill/tool entry?`
            : `Add another ${label} skill/tool entry?`,
        default: false,
      },
    ]);
    if (!add) {
      return entries;
    }

    const entry = await inquirer.prompt<{ kind: 'skill' | 'tool'; name: string; install: string }>([
      {
        type: 'list',
        name: 'kind',
        message: `Kind of ${label} entry:`,
        choices: [
          { name: 'skill', value: 'skill' },
          { name: 'tool', value: 'tool' },
        ],
      },
      {
        type: 'input',
        name: 'name',
        message: 'Name:',
        validate: (value: string) => value.trim().length > 0 || 'Name is required',
        filter: (value: string) => value.trim(),
      },
      {
        type: 'input',
        name: 'install',
        message: 'Installation hint (optional):',
      },
    ]);

    const requirement: ProfileRequirement = { kind: entry.kind, name: entry.name };
    if (entry.install.trim().length > 0) {
      requirement.install = entry.install.trim();
    }
    entries.push(requirement);
  }
}
