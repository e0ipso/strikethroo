/**
 * Main Init Command Implementation
 *
 * This file contains the implementation of the init command
 * Handles initialization of new Strikethroo projects
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { InitOptions, CommandResult, ConflictResolution, InitMetadata } from './types';
import { parseHarnesses, validateHarnesses } from './utils';
import {
  calculateFileHash,
  loadMetadata,
  saveMetadata,
  getPackageVersion,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
} from './metadata';
import { detectConflicts } from './conflict-detector';
import { promptForConflicts } from './prompts';
import { HarnessRegistry } from './harnesses';
import { prepareProfileImport, PreparedProfileImport, ProfileManifest } from './profiles';

// Visual formatting constants
const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

/**
 * Template-side name of the workspace ignore file, and the name it lands under.
 *
 * The file cannot ship under its final name: npm mangles `.gitignore` at both
 * ends of the pipe. npm-packlist reads one as ignore rules and drops it from
 * the tarball, and any that survives packing is renamed to `.npmignore` on
 * extract. A workspace installed from npm therefore got no ignore file at all,
 * and its machine-generated dispatch cache showed up as untracked content —
 * including inside the code review gate's diff, which only excludes paths git
 * already ignores. Shipping under a neutral name and renaming at copy time is
 * the only delivery that behaves the same from the package and from a checkout.
 */
const WORKSPACE_IGNORE_TEMPLATE = 'gitignore';
const WORKSPACE_IGNORE_FILE = '.gitignore';

/**
 * Format a section header with cyan styling
 */
function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}

/**
 * Get the absolute path to a template file
 */
function getTemplatePath(templateFile: string): string {
  return path.join(__dirname, '..', 'templates', templateFile);
}

/**
 * Resolve path segments relative to a base directory with cross-platform compatibility
 */
function resolvePath(baseDir: string | undefined, ...segments: string[]): string {
  const base = baseDir || '.';
  const validSegments = segments.filter(
    segment => segment !== null && segment !== undefined && segment !== ''
  );
  return path.resolve(base, ...validSegments);
}

/**
 * Collect all file paths under a directory, sorted alphabetically
 */
async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  if (!(await exists(dir))) return files;

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name !== '.init-metadata.json') {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files.sort();
}

/**
 * Check if a file or directory exists
 */
async function exists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize a new Strikethroo project
 *
 * Creates directory structures and copies template files based on the selected harnesses.
 * Validates input, creates necessary directories, and copies appropriate templates.
 *
 * @param options - Initialization options containing harness selection
 * @returns CommandResult indicating success or failure with details
 */
export async function init(options: InitOptions): Promise<CommandResult> {
  let preparedProfile: PreparedProfileImport | undefined;
  try {
    // Determine base directory
    const baseDir = options.destinationDirectory || '.';
    const resolvedBaseDir = resolvePath(baseDir);

    // Parse and validate harnesses
    const harnesses = parseHarnesses(options.harnesses);
    validateHarnesses(harnesses);

    // Prepare the strikethroo profile import (resolve/clone/validate/stage)
    // BEFORE any destination mutation, so a failed import leaves the
    // destination untouched.
    if (options.profile) {
      preparedProfile = await prepareProfileImport(options.profile, getTemplatePath('strikethroo'));
    }

    // ========== HEADER SECTION ==========
    console.log(chalk.bold.white('\nStrikethroo Initialization'));
    console.log(chalk.gray(DIVIDER));

    // ========== CONFIGURATION SECTION ==========
    console.log(formatSectionHeader('Configuration'));
    console.log(`  ${chalk.cyan('●')} Target Directory: ${resolvedBaseDir}`);
    console.log(`  ${chalk.cyan('●')} Harnesses: ${harnesses.join(', ')}`);

    // ========== STRIKETHROO PROFILE SECTION (only when importing one) ==========
    if (preparedProfile) {
      displayProfileSection(preparedProfile.manifest, preparedProfile.source);
    }

    // ========== SETUP PROGRESS SECTION ==========
    console.log(formatSectionHeader('Setup Progress'));

    // Create .ai/strikethroo structure
    console.log(`  ${chalk.green('✓')} Creating .ai/strikethroo directory structure`);
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/plans'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/archive'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/config/hooks'));

    // Copy common templates to .ai/strikethroo with conflict detection
    console.log(`  ${chalk.green('✓')} Copying common template files`);
    await copyCommonTemplates(baseDir, options.force || false, preparedProfile?.stagingDir);

    // Record strikethroo profile provenance in the freshly written metadata
    if (preparedProfile) {
      await recordProfileProvenance(
        resolvePath(baseDir, '.ai/strikethroo/.init-metadata.json'),
        preparedProfile.manifest.name,
        preparedProfile.source
      );
    }

    // Create harness-specific directories and copy templates via the registry
    const allCreatedAgentFiles: Map<string, string[]> = new Map();
    for (const harness of harnesses) {
      console.log(`  ${chalk.green('✓')} Setting up ${harness} harness configuration`);
      const adapter = HarnessRegistry.get(harness);
      if (!adapter) {
        throw new Error(`No registered harness adapter for: ${harness}`);
      }
      const created = await adapter.install(baseDir);
      if (created.length > 0) {
        allCreatedAgentFiles.set(harness, created);
      }
    }

    // ========== CREATED FILES SECTION ==========
    console.log(formatSectionHeader('Created Files'));

    // Common configuration files (dynamically listed)
    console.log(chalk.cyan('  Common Configuration:'));
    const commonFiles = await collectFiles(resolvePath(baseDir, '.ai/strikethroo'));
    for (const file of commonFiles) {
      console.log(`    ${chalk.blue('●')} ${file}`);
    }

    for (const [harness, files] of allCreatedAgentFiles) {
      console.log(chalk.cyan(`  ${harness} Agents:`));
      for (const file of files) {
        console.log(`    ${chalk.blue('●')} ${file}`);
      }
    }

    // ========== FOOTER SECTION ==========
    console.log(`\n${chalk.green('✓')} Strikethroo initialized successfully!`);
    console.log(chalk.gray(DIVIDER));

    // Post-init nudge directing users to install the task skills
    console.log(
      '\nNext: run `npx skills add e0ipso/strikethroo` to install the task skills for your harness(es).'
    );

    // Add documentation link
    console.log(`\n  📚 Documentation: ${chalk.cyan('https://strikethroo.canpicasoft.com')}\n`);

    // Show suggested workflow help text
    await displayWorkflowHelp();

    return {
      success: true,
      message: 'Strikethroo initialized successfully!',
      data: { harnesses },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Initialization failed with unknown error';
    console.error(chalk.red(`\n✗ Initialization failed: ${errorMessage}\n`));

    return {
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    // Remove the profile staging temp dirs once the copy machinery is done,
    // on success and failure alike (cleanup is idempotent).
    if (preparedProfile) {
      await preparedProfile.cleanup();
    }
  }
}

/**
 * Print the strikethroo profile section: identity, hard prerequisites
 * (emphasized — never probed or installed), and soft pairings
 */
function displayProfileSection(manifest: ProfileManifest, source: string): void {
  console.log(formatSectionHeader('Strikethroo Profile'));
  console.log(`  ${chalk.cyan('●')} Name: ${manifest.name}`);
  console.log(`  ${chalk.cyan('●')} Description: ${manifest.description}`);
  console.log(`  ${chalk.cyan('●')} Source: ${source}`);

  if (manifest.requires && manifest.requires.length > 0) {
    console.log(chalk.yellow.bold('\n  This strikethroo profile assumes you have:'));
    for (const requirement of manifest.requires) {
      const hint = requirement.install ? chalk.gray(` — install: ${requirement.install}`) : '';
      console.log(
        `    ${chalk.yellow('▲')} ${chalk.bold(`${requirement.name} (${requirement.kind})`)}${hint}`
      );
    }
  }

  if (manifest.recommends && manifest.recommends.length > 0) {
    console.log(chalk.gray('\n  This strikethroo profile pairs well with:'));
    for (const recommendation of manifest.recommends) {
      const hint = recommendation.install ? ` — install: ${recommendation.install}` : '';
      console.log(chalk.gray(`    ● ${recommendation.name} (${recommendation.kind})${hint}`));
    }
  }
}

/**
 * Record strikethroo profile provenance in the just-written metadata file.
 *
 * Small wrapper around load/save so `createMetadata` and the no-profile
 * metadata shape stay untouched: the `profile` field exists only when a
 * profile was imported.
 */
async function recordProfileProvenance(
  metadataPath: string,
  name: string,
  source: string
): Promise<void> {
  const metadata = await loadMetadata(metadataPath);
  if (!metadata) {
    throw new Error(
      `Cannot record strikethroo profile provenance: metadata file missing or invalid at ${metadataPath}`
    );
  }
  metadata.profile = { name, source, importedAt: new Date().toISOString() };
  await saveMetadata(metadataPath, metadata);
}

/**
 * Copy common template files to .ai/strikethroo directory with conflict detection
 *
 * @param sourceDir - Source template tree; defaults to the shipped
 *   `templates/strikethroo/` path, overridden by a profile staging tree
 */
async function copyCommonTemplates(
  baseDir: string,
  force: boolean,
  sourceDir: string = getTemplatePath('strikethroo')
): Promise<void> {
  const destDir = resolvePath(baseDir, '.ai/strikethroo');
  const metadataPath = resolvePath(destDir, '.init-metadata.json');

  // Check if source template directory exists
  if (!(await exists(sourceDir))) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  // Load existing metadata if present
  const existingMetadata = await loadMetadata(metadataPath);

  // The ignore file is copied separately, under its final name
  const copyOptions = {
    overwrite: true,
    filter: (src: string) => path.relative(sourceDir, src) !== WORKSPACE_IGNORE_TEMPLATE,
  };

  // Scenario 1: First-time init (no metadata) - copy all files
  if (!existingMetadata) {
    await fs.copy(sourceDir, destDir, copyOptions);
    await copyWorkspaceIgnoreFile(sourceDir, destDir);
    // Create initial metadata
    await createMetadata(sourceDir, destDir, metadataPath);
    return;
  }

  // Scenario 2: Force flag - overwrite all files
  if (force) {
    await fs.copy(sourceDir, destDir, copyOptions);
    await copyWorkspaceIgnoreFile(sourceDir, destDir);
    // Update metadata
    await createMetadata(sourceDir, destDir, metadataPath);
    return;
  }

  // Scenario 3: Conflict detection - check for user modifications
  const conflicts = await detectConflicts(destDir, sourceDir, existingMetadata);

  if (conflicts.length === 0) {
    await fs.copy(sourceDir, destDir, copyOptions);
    await copyWorkspaceIgnoreFile(sourceDir, destDir);
    // Update metadata
    await createMetadata(sourceDir, destDir, metadataPath);
    return;
  }

  // Conflicts detected - prompt user for resolution
  console.log(
    chalk.yellow(
      `\n⚠  Detected ${conflicts.length} modified file(s). Prompting for resolution...\n`
    )
  );
  const resolutions = await promptForConflicts(conflicts);

  // Apply resolutions
  await applyResolutions(sourceDir, destDir, resolutions);
  await copyWorkspaceIgnoreFile(sourceDir, destDir);

  // Update metadata for all files (including resolved conflicts)
  await createMetadata(sourceDir, destDir, metadataPath);
}

/**
 * Copy the workspace ignore template to its final `.gitignore` name.
 *
 * Runs on every init path, including the conflict path — conflict detection
 * and hash tracking are scoped to `config/`, so this file has no baseline to
 * compare against and is refreshed rather than prompted over. Refreshing is
 * the behaviour that matters here: a workspace initialized before an entry was
 * added would otherwise keep leaking the paths that entry covers.
 */
async function copyWorkspaceIgnoreFile(sourceDir: string, destDir: string): Promise<void> {
  const source = path.join(sourceDir, WORKSPACE_IGNORE_TEMPLATE);
  if (!(await exists(source))) {
    throw new Error(
      `Workspace ignore template not found: ${source}. The published package must ship ` +
        `templates/strikethroo/${WORKSPACE_IGNORE_TEMPLATE}.`
    );
  }
  await fs.copy(source, path.join(destDir, WORKSPACE_IGNORE_FILE), { overwrite: true });
}

/**
 * Create or update metadata file with current file hashes
 */
async function createMetadata(
  sourceDir: string,
  destDir: string,
  metadataPath: string
): Promise<void> {
  const files: Record<string, string> = {};

  async function walkDir(dir: string, relativeTo: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeTo, fullPath);

      // Skip README.md (always overwrite on init/re-init)
      if (relativePath === 'README.md') {
        continue;
      }

      // Skip metadata file itself
      if (relativePath === '.init-metadata.json') {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativeTo);
      } else if (entry.isFile()) {
        // Calculate hash of the destination file (what we just copied)
        const destFilePath = path.join(destDir, relativePath);
        if (await exists(destFilePath)) {
          const hash = await calculateFileHash(destFilePath);
          files[relativePath] = hash;
        }
      }
    }
  }

  const configDir = path.join(destDir, 'config');
  if (await exists(configDir)) {
    await walkDir(configDir, destDir);
  }

  // Create metadata object
  const metadata: InitMetadata = {
    version: getPackageVersion(),
    workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    files,
  };

  // Save metadata
  await saveMetadata(metadataPath, metadata);
}

/**
 * Apply user resolutions to file conflicts
 */
async function applyResolutions(
  sourceDir: string,
  destDir: string,
  resolutions: Map<string, ConflictResolution>
): Promise<void> {
  for (const [relativePath, resolution] of resolutions) {
    const sourcePath = path.join(sourceDir, relativePath);
    const destPath = path.join(destDir, relativePath);

    if (resolution === 'overwrite') {
      await fs.copy(sourcePath, destPath, { overwrite: true });
    }
    // If 'keep', do nothing - keep user's file
  }
}

/**
 * Check if a directory already has Strikethroo initialized
 */
export async function isInitialized(baseDir?: string): Promise<boolean> {
  const targetDir = baseDir || '.';
  return await exists(resolvePath(targetDir, '.ai/strikethroo'));
}

/**
 * Display formatted workflow help text to guide users after successful installation
 */
async function displayWorkflowHelp(): Promise<void> {
  console.log(formatSectionHeader('Suggested Workflow'));

  console.log(`  ${chalk.cyan('●')} Install the task skills:`);
  console.log(`      ${chalk.gray('npx skills add e0ipso/strikethroo')}`);
  console.log('');
  console.log(`  ${chalk.cyan('●')} Ask your AI to plan, decompose, then execute.`);
  console.log(
    `    The skills cover plan creation, refinement, task generation, and blueprint execution.`
  );
  console.log('');
  console.log(`  ${chalk.cyan('●')} Review intermediate artifacts between steps:`);
  console.log(`      ${chalk.gray('.ai/strikethroo/plans/')}`);
  console.log('');
  console.log(
    chalk.yellow(`💡 Reviewing the plan and the task list before execution is recommended.`)
  );
  console.log('');
}
