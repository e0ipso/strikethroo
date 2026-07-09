/**
 * Main Init Command Implementation
 *
 * This file contains the implementation of the init command
 * Handles initialization of new Strikethroo projects
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { InitOptions, Harness, CommandResult, ConflictResolution, InitMetadata } from './types';
import {
  parseHarnesses,
  validateHarnesses,
  getAgentFormat,
  convertAgentMdToToml,
  convertAgentMdToKiroJson,
} from './utils';
import {
  calculateFileHash,
  loadMetadata,
  saveMetadata,
  getPackageVersion,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
} from './metadata';
import { detectConflicts } from './conflict-detector';
import { promptForConflicts } from './prompts';

// Visual formatting constants
const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

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
  try {
    // Determine base directory
    const baseDir = options.destinationDirectory || '.';
    const resolvedBaseDir = resolvePath(baseDir);

    // Parse and validate harnesses
    const harnesses = parseHarnesses(options.harnesses);
    validateHarnesses(harnesses);

    // ========== HEADER SECTION ==========
    console.log(chalk.bold.white('\nStrikethroo Initialization'));
    console.log(chalk.gray(DIVIDER));

    // ========== CONFIGURATION SECTION ==========
    console.log(formatSectionHeader('Configuration'));
    console.log(`  ${chalk.cyan('●')} Target Directory: ${resolvedBaseDir}`);
    console.log(`  ${chalk.cyan('●')} Harnesses: ${harnesses.join(', ')}`);

    // ========== SETUP PROGRESS SECTION ==========
    console.log(formatSectionHeader('Setup Progress'));

    // Create .ai/strikethroo structure
    console.log(`  ${chalk.green('✓')} Creating .ai/strikethroo directory structure`);
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/plans'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/archive'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/strikethroo/config/hooks'));

    // Copy common templates to .ai/strikethroo with conflict detection
    console.log(`  ${chalk.green('✓')} Copying common template files`);
    await copyCommonTemplates(baseDir, options.force || false);

    // Create harness-specific directories and copy templates
    const allCreatedAgentFiles: Map<string, string[]> = new Map();
    for (const harness of harnesses) {
      console.log(`  ${chalk.green('✓')} Setting up ${harness} harness configuration`);
      const created = await createHarnessStructure(harness, baseDir);
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
  }
}

/**
 * Copy common template files to .ai/strikethroo directory with conflict detection
 */
async function copyCommonTemplates(baseDir: string, force: boolean): Promise<void> {
  const sourceDir = getTemplatePath('strikethroo');
  const destDir = resolvePath(baseDir, '.ai/strikethroo');
  const metadataPath = resolvePath(destDir, '.init-metadata.json');

  // Check if source template directory exists
  if (!(await exists(sourceDir))) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  // Load existing metadata if present
  const existingMetadata = await loadMetadata(metadataPath);

  // Scenario 1: First-time init (no metadata) - copy all files
  if (!existingMetadata) {
    await fs.copy(sourceDir, destDir);
    // Create initial metadata
    await createMetadata(sourceDir, destDir, metadataPath);
    return;
  }

  // Scenario 2: Force flag - overwrite all files
  if (force) {
    await fs.copy(sourceDir, destDir, { overwrite: true });
    // Update metadata
    await createMetadata(sourceDir, destDir, metadataPath);
    return;
  }

  // Scenario 3: Conflict detection - check for user modifications
  const conflicts = await detectConflicts(destDir, sourceDir, existingMetadata);

  if (conflicts.length === 0) {
    await fs.copy(sourceDir, destDir, { overwrite: true });
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

  // Update metadata for all files (including resolved conflicts)
  await createMetadata(sourceDir, destDir, metadataPath);
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

async function createHarnessStructure(harness: Harness, baseDir: string): Promise<string[]> {
  const sourceAgentsDir = getTemplatePath(path.join('harness', 'agents'));
  const createdFiles: string[] = [];

  if (!(await exists(sourceAgentsDir))) {
    return createdFiles;
  }

  const agentFiles = (await fs.readdir(sourceAgentsDir)).filter(f => f.endsWith('.md'));
  const formatInfo = getAgentFormat(harness);
  const targetDir = resolvePath(baseDir, formatInfo.directory);
  await fs.ensureDir(targetDir);

  for (const agentFile of agentFiles) {
    const sourcePath = path.join(sourceAgentsDir, agentFile);
    const content = await fs.readFile(sourcePath, 'utf-8');
    const baseName = path.basename(agentFile, '.md');
    const targetName = baseName + formatInfo.extension;
    const targetPath = path.join(targetDir, targetName);

    if (formatInfo.format === 'toml') {
      await fs.writeFile(targetPath, convertAgentMdToToml(content), 'utf-8');
    } else if (formatInfo.format === 'json') {
      await fs.writeFile(targetPath, convertAgentMdToKiroJson(content), 'utf-8');
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }

    createdFiles.push(targetPath);
  }

  return createdFiles;
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
