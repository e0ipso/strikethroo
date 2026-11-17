/**
 * Main Init Command Implementation
 *
 * This file contains the implementation of the init command
 * Handles initialization of new Strikethroo projects
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import {
  InitOptions,
  CommandResult,
  ConflictResolution,
  InitMetadata,
  Harness,
  FileSystemError,
} from './types';
import { ensureContainedDirectory } from './skill-scripts/shared/safe-fs';
import { resolveInitHarnesses } from './resolve-init-harnesses';
import {
  calculateFileHash,
  loadMetadata,
  saveMetadata,
  getPackageVersion,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
} from './metadata';
import {
  classifyRefresh,
  detectConflicts,
  getConfigFiles,
  INSTALL_ONLY_CONFIG_FILES,
  RefreshKind,
} from './conflict-detector';
import {
  detectManagedConflicts,
  hashContent,
  ManagedFile,
  ManagedOutcome,
  refreshManagedFiles,
  replaceManagedFile,
} from './managed-files';
import {
  promptForConflicts,
  showIncomingInstallOnlyDiff,
  showReplacedLocalChangesDiff,
} from './prompts';
import { HarnessRegistry } from './harnesses';
import { prepareProfileImport, PreparedProfileImport, ProfileManifest } from './profiles';
import { toTerminalText } from './skill-scripts/shared/terminal-text';

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
 * Create `dir` below `projectRoot` without following a link at any level, so a
 * planted `.ai/strikethroo/config` or `config/hooks` link cannot carry a
 * template write out of the project.
 */
function ensureProjectDirectory(projectRoot: string, dir: string): void {
  const ensured = ensureContainedDirectory(projectRoot, dir);
  if ('error' in ensured) {
    const reason =
      ensured.error === 'symlink'
        ? 'it or a parent directory is a symbolic link, which cannot be trusted.'
        : ensured.message;
    throw new FileSystemError(
      `Cannot write into ${dir}: ${reason} Replace it with a regular directory and re-run the ` +
        'command.'
    );
  }
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
    const metadataPath = resolvePath(baseDir, '.ai/strikethroo/.init-metadata.json');

    // Resolve harnesses before any destination mutation
    const existingMetadata = await loadMetadata(metadataPath);
    const { harnesses } = resolveInitHarnesses({
      explicit: options.harnesses,
      saved: existingMetadata?.harnesses,
    });

    // Prepare the strikethroo profile import (resolve/clone/validate/stage)
    // BEFORE any destination mutation, so a failed import leaves the
    // destination untouched.
    if (options.profile) {
      preparedProfile = await prepareProfileImport(options.profile, getTemplatePath('strikethroo'));
    }

    // ========== HEADER SECTION ==========
    const isUpdate = options.mode === 'update';
    if (!isUpdate) {
      console.log(chalk.bold.white('\nStrikethroo Initialization'));
      console.log(chalk.gray(DIVIDER));
    }

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
    // The destination itself is the containment root, so it is created plainly;
    // everything below it is created through the contained helper.
    await fs.ensureDir(resolvePath(baseDir));
    for (const dir of ['plans', 'archive', 'config/hooks']) {
      ensureProjectDirectory(resolvePath(baseDir), resolvePath(baseDir, '.ai/strikethroo', dir));
    }

    // Plan the harness agent files via the registry; the refresh writes them
    const agentFilesByHarness = await planHarnessFiles(harnesses);

    // Refresh .ai/strikethroo and the agent files with conflict detection
    console.log(`  ${chalk.green('✓')} Copying common template files`);
    for (const harness of agentFilesByHarness.keys()) {
      console.log(`  ${chalk.green('✓')} Setting up ${harness} harness configuration`);
    }
    await refreshWorkspace(baseDir, options.force || false, {
      sourceDir: preparedProfile?.stagingDir ?? getTemplatePath('strikethroo'),
      agentFiles: [...agentFilesByHarness.values()].flat(),
      importedProfile: preparedProfile && {
        name: preparedProfile.manifest.name,
        source: preparedProfile.source,
        configFiles: preparedProfile.configFiles,
      },
    });

    // Persist harness selection only after successful setup
    await recordHarnessSelection(metadataPath, harnesses);

    // ========== CREATED FILES SECTION ==========
    console.log(formatSectionHeader('Created Files'));

    // Common configuration files (dynamically listed)
    console.log(chalk.cyan('  Common Configuration:'));
    const commonFiles = await collectFiles(resolvePath(baseDir, '.ai/strikethroo'));
    for (const file of commonFiles) {
      console.log(`    ${chalk.blue('●')} ${file}`);
    }

    for (const [harness, files] of agentFilesByHarness) {
      if (files.length === 0) continue;
      console.log(chalk.cyan(`  ${harness} Agents:`));
      for (const file of files) {
        console.log(`    ${chalk.blue('●')} ${resolvePath(baseDir, file.relativePath)}`);
      }
    }

    // ========== FOOTER SECTION ==========
    if (!isUpdate) {
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
    }

    return {
      success: true,
      message: isUpdate
        ? 'Strikethroo workspace refreshed successfully!'
        : 'Strikethroo initialized successfully!',
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
  // Every manifest string comes from the profile, possibly a remote one.
  const t = toTerminalText;
  console.log(formatSectionHeader('Strikethroo Profile'));
  console.log(`  ${chalk.cyan('●')} Name: ${t(manifest.name)}`);
  console.log(`  ${chalk.cyan('●')} Description: ${t(manifest.description)}`);
  console.log(`  ${chalk.cyan('●')} Source: ${t(source)}`);

  if (manifest.requires && manifest.requires.length > 0) {
    console.log(chalk.yellow.bold('\n  This strikethroo profile assumes you have:'));
    for (const requirement of manifest.requires) {
      const hint = requirement.install ? chalk.gray(` — install: ${t(requirement.install)}`) : '';
      console.log(
        `    ${chalk.yellow('▲')} ${chalk.bold(`${t(requirement.name)} (${requirement.kind})`)}${hint}`
      );
    }
  }

  if (manifest.recommends && manifest.recommends.length > 0) {
    console.log(chalk.gray('\n  This strikethroo profile pairs well with:'));
    for (const recommendation of manifest.recommends) {
      const hint = recommendation.install ? ` — install: ${t(recommendation.install)}` : '';
      console.log(chalk.gray(`    ● ${t(recommendation.name)} (${recommendation.kind})${hint}`));
    }
  }
}

/**
 * Plan the agent files of every selected harness through the registry.
 */
async function planHarnessFiles(harnesses: Harness[]): Promise<Map<Harness, ManagedFile[]>> {
  const planned = new Map<Harness, ManagedFile[]>();
  for (const harness of harnesses) {
    const adapter = HarnessRegistry.get(harness);
    if (!adapter) {
      throw new Error(`No registered harness adapter for: ${harness}`);
    }
    planned.set(harness, await adapter.plan());
  }
  return planned;
}

/**
 * Record the successfully installed harness selection in metadata.
 */
async function recordHarnessSelection(metadataPath: string, harnesses: Harness[]): Promise<void> {
  const metadata = await loadMetadata(metadataPath);
  if (!metadata) {
    throw new Error(
      `Cannot record harness selection: metadata file missing or invalid at ${metadataPath}`
    );
  }
  metadata.harnesses = harnesses;
  await saveMetadata(metadataPath, metadata);
}

/** What a refresh did with one incoming `config/` path, and the hash it records. */
interface RefreshOutcome {
  relativePath: string;
  kind: RefreshKind;
  hash: string | undefined;
}

/** A profile imported by this refresh. */
interface ImportedProfile {
  name: string;
  source: string;
  /** `config/` paths the profile package supplies. */
  configFiles: string[];
}

/** What one workspace refresh writes besides the shipped `config/` tree. */
interface WorkspaceRefreshInput {
  /**
   * Source template tree: the shipped `templates/strikethroo/` path, or a
   * profile staging tree.
   */
  sourceDir: string;
  /** Harness agent files, by project-relative path. */
  agentFiles: ManagedFile[];
  importedProfile?: ImportedProfile;
}

/** Project-relative path of the workspace ignore file in `managedFiles`. */
const WORKSPACE_IGNORE_MANAGED_PATH = path.join('.ai', 'strikethroo', WORKSPACE_IGNORE_FILE);

/** Whether an answer authorizes replacing the file. */
function isOverwrite(resolution: ConflictResolution | undefined): boolean {
  return resolution === 'overwrite' || resolution === 'overwrite-all';
}

/**
 * Refresh the workspace templates, the workspace `.gitignore`, and the harness
 * agent files.
 *
 * Every `config/` path and agent file gets its own outcome, so one conflict
 * never stops another file from being installed, refreshed, or restored. All
 * conflicts are collected first and asked about in one prompt, so a session
 * that cannot prompt fails before anything is written. Missing or unusable
 * metadata is not a first install: every existing destination is then
 * untracked, and each one that differs from its incoming file needs a
 * decision. `force` is the only route that skips the question.
 *
 * Three rules sit on top of the conflict check:
 * - Install-only paths (`INSTALL_ONLY_CONFIG_FILES`) are written only when
 *   absent and never asked about; a changed incoming version shows a diff once.
 * - Files the recorded profile supplied are asked about, never refreshed
 *   silently, on a refresh that does not import a profile.
 * - The workspace `.gitignore` is always replaced, and local changes it had
 *   are shown as a diff.
 *
 * Files are written first and the metadata last; a failed write throws before
 * `saveMetadata` runs, leaving the previous metadata in place.
 */
async function refreshWorkspace(
  baseDir: string,
  force: boolean,
  input: WorkspaceRefreshInput
): Promise<void> {
  const { sourceDir, agentFiles, importedProfile } = input;
  const destDir = resolvePath(baseDir, '.ai/strikethroo');
  const metadataPath = resolvePath(destDir, '.init-metadata.json');

  if (!(await exists(sourceDir))) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  // Every directory a template lands in is created or checked first, so no
  // later hash, prompt, or copy goes through a linked directory.
  const projectRoot = path.dirname(path.dirname(destDir));
  for (const file of await collectFiles(sourceDir)) {
    ensureProjectDirectory(
      projectRoot,
      path.dirname(path.join(destDir, path.relative(sourceDir, file)))
    );
  }

  const existingMetadata = await loadMetadata(metadataPath);
  const baseline = existingMetadata?.files ?? {};
  const managedBaseline = existingMetadata?.managedFiles ?? {};
  const protectedPaths = new Set<string>(
    importedProfile ? [] : (existingMetadata?.profile?.files ?? [])
  );

  let resolutions = new Map<string, ConflictResolution>();
  if (!force) {
    const conflicts = [
      ...(await detectConflicts(destDir, sourceDir, baseline, protectedPaths)),
      ...detectManagedConflicts(projectRoot, agentFiles, managedBaseline),
    ];
    if (conflicts.length > 0) {
      if (!existingMetadata) {
        console.log(
          chalk.yellow(
            '\n⚠  .init-metadata.json is missing or unusable, so no file has a trusted baseline.'
          )
        );
      }
      console.log(
        chalk.yellow(
          `\n⚠  ${conflicts.length} file(s) differ from the incoming version and need a decision.\n`
        )
      );
      resolutions = await promptForConflicts(conflicts);
    }
  }
  const overwrite = (relativePath: string): boolean =>
    force || isOverwrite(resolutions.get(relativePath));

  const outcomes = await refreshConfigTree(sourceDir, destDir, baseline, overwrite, protectedPaths);
  await copyUntrackedTemplateFiles(sourceDir, destDir);
  const ignoreHash = await refreshWorkspaceIgnoreFile(
    sourceDir,
    projectRoot,
    managedBaseline[WORKSPACE_IGNORE_MANAGED_PATH]
  );
  const agentOutcomes = await refreshManagedFiles(
    projectRoot,
    agentFiles,
    managedBaseline,
    overwrite
  );

  await createMetadata(metadataPath, existingMetadata, {
    files: recordBaselines(baseline, outcomes),
    managedFiles: recordManagedBaselines(ignoreHash, agentOutcomes),
    profile: recordProfile(existingMetadata, importedProfile, outcomes),
  });
}

/**
 * Decide and apply one outcome per incoming `config/` path.
 */
async function refreshConfigTree(
  sourceDir: string,
  destDir: string,
  baseline: Record<string, string>,
  overwrite: (relativePath: string) => boolean,
  protectedPaths: ReadonlySet<string>
): Promise<RefreshOutcome[]> {
  const outcomes: RefreshOutcome[] = [];
  for (const relativePath of await getConfigFiles(sourceDir)) {
    const sourcePath = path.join(sourceDir, relativePath);
    const destPath = path.join(destDir, relativePath);
    const installOnly = INSTALL_ONLY_CONFIG_FILES.has(relativePath);
    const incomingHash = await calculateFileHash(sourcePath);
    const outcome = await decideRefreshOutcome(destPath, installOnly, {
      incomingHash,
      recordedHash: baseline[relativePath],
      protectedBaseline: protectedPaths.has(relativePath),
      overwrite: overwrite(relativePath),
    });
    if (outcome.kind !== 'kept' && outcome.kind !== 'unchanged') {
      await fs.copy(sourcePath, destPath, { overwrite: true });
    }
    if (installOnly && outcome.kind === 'kept' && baseline[relativePath] !== incomingHash) {
      showIncomingInstallOnlyDiff(
        relativePath,
        await fs.readFile(destPath, 'utf-8'),
        await fs.readFile(sourcePath, 'utf-8')
      );
    }
    outcomes.push({ relativePath, ...outcome });
  }
  return outcomes;
}

/**
 * Classify one `config/` destination (see `classifyRefresh`).
 *
 * An existing install-only destination is always kept, whatever its baseline,
 * answer, or `force`, and records the incoming hash so the same incoming
 * version is shown to the user only once.
 */
async function decideRefreshOutcome(
  destPath: string,
  installOnly: boolean,
  incoming: {
    incomingHash: string;
    recordedHash: string | undefined;
    protectedBaseline: boolean;
    overwrite: boolean;
  }
): Promise<Pick<RefreshOutcome, 'kind' | 'hash'>> {
  const currentHash = (await exists(destPath)) ? await calculateFileHash(destPath) : undefined;
  if (installOnly && currentHash !== undefined && currentHash !== incoming.incomingHash) {
    return { kind: 'kept', hash: incoming.incomingHash };
  }
  return classifyRefresh(
    {
      currentHash,
      incomingHash: incoming.incomingHash,
      recordedHash: incoming.recordedHash,
      protectedBaseline: incoming.protectedBaseline,
    },
    incoming.overwrite
  );
}

/**
 * Build the `files` map from the refresh outcomes.
 *
 * A recorded path the incoming tree no longer ships keeps its recorded hash:
 * the refresh learned nothing new about it, and dropping one that is also gone
 * from disk would erase the deletion `validate` reports. An outcome with no
 * hash records nothing.
 */
function recordBaselines(
  baseline: Record<string, string>,
  outcomes: RefreshOutcome[]
): Record<string, string> {
  const files: Record<string, string> = { ...baseline };
  for (const { relativePath, hash } of outcomes) {
    if (hash !== undefined) {
      files[relativePath] = hash;
    }
  }
  return files;
}

/**
 * Build the `managedFiles` map: the workspace `.gitignore` plus the agent
 * files of the current harness selection. Files of a deselected harness are
 * no longer managed, so they drop out.
 */
function recordManagedBaselines(
  ignoreHash: string,
  agentOutcomes: ManagedOutcome[]
): Record<string, string> {
  const managed: Record<string, string> = { [WORKSPACE_IGNORE_MANAGED_PATH]: ignoreHash };
  for (const { relativePath, hash } of agentOutcomes) {
    if (hash !== undefined) {
      managed[relativePath] = hash;
    }
  }
  return managed;
}

/**
 * Build the profile provenance for the new metadata.
 *
 * An import records the profile's `config/` files, minus install-only paths,
 * which are never replaced anyway. A refresh without an import keeps only the
 * profile files the user kept: an overwritten, refreshed, or unchanged file
 * now holds the incoming version and needs no more protection.
 */
function recordProfile(
  existingMetadata: InitMetadata | null,
  importedProfile: ImportedProfile | undefined,
  outcomes: RefreshOutcome[]
): InitMetadata['profile'] {
  if (importedProfile) {
    return {
      name: importedProfile.name,
      source: importedProfile.source,
      importedAt: new Date().toISOString(),
      files: importedProfile.configFiles.filter(file => !INSTALL_ONLY_CONFIG_FILES.has(file)),
    };
  }
  const previous = existingMetadata?.profile;
  if (!previous?.files) return previous;
  const kept = new Set(
    outcomes.filter(outcome => outcome.kind === 'kept').map(outcome => outcome.relativePath)
  );
  return { ...previous, files: previous.files.filter(file => kept.has(file)) };
}

/**
 * Copy the template entries outside `config/`, such as `README.md`, verbatim.
 *
 * They are Strikethroo-owned documentation, so they refresh on every run
 * without a hash check. The ignore template is excluded here because it lands
 * under a different name.
 */
async function copyUntrackedTemplateFiles(sourceDir: string, destDir: string): Promise<void> {
  await fs.copy(sourceDir, destDir, {
    overwrite: true,
    filter: src => {
      const [first] = path.relative(sourceDir, src).split(path.sep);
      return first !== 'config' && first !== WORKSPACE_IGNORE_TEMPLATE;
    },
  });
}

/**
 * Write the workspace ignore template to its final `.gitignore` name.
 *
 * Runs on every init path and always writes the incoming version: a workspace
 * initialized before an entry was added would otherwise keep leaking the paths
 * that entry covers. When the local file had changes of its own, the replaced
 * lines are shown as a diff so the user can re-apply them.
 *
 * @returns The hash of the written file, for `managedFiles`
 */
async function refreshWorkspaceIgnoreFile(
  sourceDir: string,
  projectRoot: string,
  recordedHash: string | undefined
): Promise<string> {
  const source = path.join(sourceDir, WORKSPACE_IGNORE_TEMPLATE);
  if (!(await exists(source))) {
    throw new Error(
      `Workspace ignore template not found: ${source}. The published package must ship ` +
        `templates/strikethroo/${WORKSPACE_IGNORE_TEMPLATE}.`
    );
  }
  const file: ManagedFile = {
    relativePath: WORKSPACE_IGNORE_MANAGED_PATH,
    content: await fs.readFile(source, 'utf-8'),
  };
  const replaced = await replaceManagedFile(projectRoot, file, recordedHash);
  if (replaced !== undefined) {
    showReplacedLocalChangesDiff(file.relativePath, replaced, file.content);
  }
  return hashContent(file.content);
}

/**
 * Write the metadata for a completed refresh, carrying the harness selection
 * forward from the previous metadata.
 */
async function createMetadata(
  metadataPath: string,
  existingMetadata: InitMetadata | null,
  recorded: Pick<InitMetadata, 'files' | 'managedFiles' | 'profile'>
): Promise<void> {
  const metadata: InitMetadata = {
    version: getPackageVersion(),
    workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    files: recorded.files,
    managedFiles: recorded.managedFiles,
  };

  if (recorded.profile) {
    metadata.profile = recorded.profile;
  }
  if (existingMetadata?.harnesses) {
    metadata.harnesses = existingMetadata.harnesses;
  }

  await saveMetadata(metadataPath, metadata);
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

export { resolveInitHarnesses, normalizeSavedHarnesses } from './resolve-init-harnesses';
export type { ResolveInitHarnessesInput } from './resolve-init-harnesses';
