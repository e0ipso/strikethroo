/**
 * Main Init Command Implementation
 *
 * This file contains the implementation of the init command
 * Handles initialization of new AI task management projects
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { InitOptions, Harness, CommandResult, ConflictResolution, InitMetadata } from './types';
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
 * Initialize a new AI Task Manager project
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
    console.log(chalk.bold.white('\nAI Task Manager Initialization'));
    console.log(chalk.gray(DIVIDER));

    // ========== CONFIGURATION SECTION ==========
    console.log(formatSectionHeader('Configuration'));
    console.log(`  ${chalk.cyan('●')} Target Directory: ${resolvedBaseDir}`);
    console.log(`  ${chalk.cyan('●')} Harnesses: ${harnesses.join(', ')}`);

    // ========== SETUP PROGRESS SECTION ==========
    console.log(formatSectionHeader('Setup Progress'));

    // Create .ai/task-manager structure
    console.log(`  ${chalk.green('✓')} Creating .ai/task-manager directory structure`);
    await fs.ensureDir(resolvePath(baseDir, '.ai/task-manager/plans'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/task-manager/archive'));
    await fs.ensureDir(resolvePath(baseDir, '.ai/task-manager/config/hooks'));

    // Copy common templates to .ai/task-manager with conflict detection
    console.log(`  ${chalk.green('✓')} Copying common template files`);
    await copyCommonTemplates(baseDir, options.force || false);

    // Create harness-specific directories and copy templates
    for (const harness of harnesses) {
      console.log(`  ${chalk.green('✓')} Setting up ${harness} harness configuration`);
      await createHarnessStructure(harness, baseDir);
    }

    // ========== CREATED FILES SECTION ==========
    console.log(formatSectionHeader('Created Files'));

    // Common configuration files (dynamically listed)
    console.log(chalk.cyan('  Common Configuration:'));
    const commonFiles = await collectFiles(resolvePath(baseDir, '.ai/task-manager'));
    for (const file of commonFiles) {
      console.log(`    ${chalk.blue('●')} ${file}`);
    }

    if (harnesses.includes('claude')) {
      const agentFiles = await collectFiles(resolvePath(baseDir, '.claude/agents'));
      if (agentFiles.length > 0) {
        console.log(chalk.cyan('  Claude Agents:'));
        for (const file of agentFiles) {
          console.log(`    ${chalk.blue('●')} ${file}`);
        }
      }
    }

    // ========== FOOTER SECTION ==========
    console.log(`\n${chalk.green('✓')} AI Task Manager initialized successfully!`);
    console.log(chalk.gray(DIVIDER));

    // Post-init nudge directing users to install the task skills
    console.log(
      '\nNext: run `npx skills add e0ipso/ai-task-manager` to install the task skills for your harness(es).'
    );

    // Add documentation link
    console.log(`\n  📚 Documentation: ${chalk.cyan('https://mateuaguilo.com/ai-task-manager')}\n`);

    // Show suggested workflow help text
    await displayWorkflowHelp();

    return {
      success: true,
      message: 'AI Task Manager initialized successfully!',
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
 * Copy common template files to .ai/task-manager directory with conflict detection
 */
async function copyCommonTemplates(baseDir: string, force: boolean): Promise<void> {
  const sourceDir = getTemplatePath('ai-task-manager');
  const destDir = resolvePath(baseDir, '.ai/task-manager');
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

async function createHarnessStructure(harness: Harness, baseDir: string): Promise<void> {
  if (harness !== 'claude') {
    console.log(
      chalk.gray(
        `    ${harness}: no files emitted — install skills with \`npx skills add e0ipso/ai-task-manager\``
      )
    );
    return;
  }

  const sourceAgentsDir = getTemplatePath(path.join('assistant', 'agents'));
  const targetAgentsDir = resolvePath(baseDir, '.claude', 'agents');

  if (await exists(sourceAgentsDir)) {
    await fs.copy(sourceAgentsDir, targetAgentsDir);
  }
}

/**
 * Check if a directory already has AI Task Manager initialized
 */
export async function isInitialized(baseDir?: string): Promise<boolean> {
  const targetDir = baseDir || '.';
  return await exists(resolvePath(targetDir, '.ai/task-manager'));
}

/**
 * Get information about existing initialization
 */
export async function getInitInfo(baseDir?: string): Promise<{
  hasAiTaskManager: boolean;
  hasClaudeAgents: boolean;
}> {
  const targetDir = baseDir || '.';
  const hasAiTaskManager = await exists(resolvePath(targetDir, '.ai/task-manager'));
  const hasClaudeAgents = await exists(resolvePath(targetDir, '.claude/agents'));

  return {
    hasAiTaskManager,
    hasClaudeAgents,
  };
}

/**
 * Display formatted workflow help text to guide users after successful installation
 */
async function displayWorkflowHelp(): Promise<void> {
  console.log(formatSectionHeader('Suggested Workflow'));

  console.log(`  ${chalk.cyan('●')} Install the task skills:`);
  console.log(`      ${chalk.gray('npx skills add e0ipso/ai-task-manager')}`);
  console.log('');
  console.log(`  ${chalk.cyan('●')} Ask your AI to plan, decompose, then execute.`);
  console.log(
    `    The skills cover plan creation, refinement, task generation, and blueprint execution.`
  );
  console.log('');
  console.log(`  ${chalk.cyan('●')} Review intermediate artifacts between steps:`);
  console.log(`      ${chalk.gray('.ai/task-manager/plans/')}`);
  console.log('');
  console.log(
    chalk.yellow(`💡 Reviewing the plan and the task list before execution is recommended.`)
  );
  console.log('');
}
