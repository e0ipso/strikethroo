/**
 * Unified update command: refresh workspace via init, then update workflow skills.
 */

import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { init } from './index';
import { loadMetadata } from './metadata';
import { resolveInitHarnesses } from './resolve-init-harnesses';
import { CommandResult, UpdateOptions } from './types';

/** Strikethroo workflow skills targeted by `strikethroo update`. */
export const STRIKETHROO_WORKFLOW_SKILLS = [
  'st-create-plan',
  'st-refine-plan',
  'st-generate-tasks',
  'st-execute-blueprint',
  'st-execute-task',
  'st-full-workflow',
  'st-code-review',
] as const;

export const SKILLS_INSTALLER_EXECUTABLE = 'npx';
export const SKILLS_INSTALLER_STDIO = 'inherit' as const;

/**
 * argv passed to `npx` (executable is `npx`, first arg is `skills`).
 */
export function buildSkillsInstallerArgs(): string[] {
  return ['skills', 'update', ...STRIKETHROO_WORKFLOW_SKILLS];
}

function resolvePath(baseDir: string | undefined, ...segments: string[]): string {
  const base = baseDir || '.';
  const validSegments = segments.filter(
    segment => segment !== null && segment !== undefined && segment !== ''
  );
  return path.resolve(base, ...validSegments);
}

export interface UpdateResult extends CommandResult {
  workspaceSuccess: boolean;
  skillsSuccess: boolean;
}

/**
 * Spawn the skills installer with inherited stdio for interactive scope selection.
 */
export async function runSkillsInstaller(cwd: string): Promise<{ success: boolean; code: number }> {
  return new Promise(resolve => {
    const child = spawn(SKILLS_INSTALLER_EXECUTABLE, buildSkillsInstallerArgs(), {
      cwd,
      shell: false,
      stdio: SKILLS_INSTALLER_STDIO,
      env: process.env,
    });

    child.on('error', () => {
      resolve({ success: false, code: 1 });
    });

    child.on('close', code => {
      resolve({ success: code === 0, code: code ?? 1 });
    });
  });
}

/**
 * Refresh an initialized workspace and update installed Strikethroo workflow skills.
 */
export async function update(options: UpdateOptions): Promise<UpdateResult> {
  const baseDir = options.destinationDirectory || '.';
  const resolvedBaseDir = resolvePath(baseDir);
  const metadataPath = resolvePath(baseDir, '.ai/strikethroo/.init-metadata.json');

  const existingMetadata = await loadMetadata(metadataPath);
  if (!existingMetadata) {
    const message =
      'Workspace is not initialized. Run `strikethroo init --harnesses <harnesses>` first.';
    console.error(chalk.red(`\n✗ Update failed: ${message}\n`));
    return {
      success: false,
      workspaceSuccess: false,
      skillsSuccess: false,
      message,
    };
  }

  let harnesses: string;
  try {
    const resolved = resolveInitHarnesses({
      explicit: options.harnesses,
      saved: existingMetadata.harnesses,
    });
    harnesses = resolved.harnesses.join(',');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve harness selection.';
    console.error(chalk.red(`\n✗ Update failed: ${message}\n`));
    return {
      success: false,
      workspaceSuccess: false,
      skillsSuccess: false,
      message,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  console.log(chalk.bold.white('\nStrikethroo Update'));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(`\n${chalk.cyan.bold('Workspace Refresh')}\n${chalk.cyan('─'.repeat(80))}\n`);

  const workspaceResult = await init({
    harnesses,
    destinationDirectory: options.destinationDirectory,
    force: options.force,
    profile: options.profile,
    mode: 'update',
  });

  const workspaceSuccess = workspaceResult.success;

  console.log(`\n${chalk.cyan.bold('Workflow Skills')}\n${chalk.cyan('─'.repeat(80))}\n`);

  if (!workspaceSuccess) {
    console.error(chalk.red('✗ Workspace refresh failed. Skipping skills update.\n'));
    return {
      success: false,
      workspaceSuccess: false,
      skillsSuccess: false,
      message: workspaceResult.message,
      error: workspaceResult.error,
    };
  }

  console.log(
    chalk.gray(`  Running: ${SKILLS_INSTALLER_EXECUTABLE} ${buildSkillsInstallerArgs().join(' ')}`)
  );
  console.log(
    chalk.gray(
      '  Choose project or global scope when prompted. Cancelled or failed installs keep the refreshed workspace.'
    )
  );
  console.log('');

  const installer = await runSkillsInstaller(resolvedBaseDir);

  console.log('');
  console.log(chalk.bold('Update summary'));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(
    `  ${workspaceSuccess ? chalk.green('✓') : chalk.red('✗')} Workspace: ${
      workspaceSuccess ? 'refreshed' : 'failed'
    }`
  );
  console.log(
    `  ${installer.success ? chalk.green('✓') : chalk.red('✗')} Workflow skills: ${
      installer.success ? 'updated' : 'not updated'
    }`
  );

  if (!installer.success) {
    console.log('');
    console.log(
      chalk.yellow(
        'Skills update did not complete. Re-run `strikethroo update` after resolving the installer issue, or run:'
      )
    );
    console.log(
      chalk.gray(`  ${SKILLS_INSTALLER_EXECUTABLE} ${buildSkillsInstallerArgs().join(' ')}`)
    );
  }

  console.log('');
  console.log(
    chalk.yellow(
      'Note: A running agent may still be using previous skill instructions. Start a fresh session after updating.'
    )
  );
  console.log('');

  const success = workspaceSuccess && installer.success;
  return {
    success,
    workspaceSuccess,
    skillsSuccess: installer.success,
    message: success
      ? 'Strikethroo workspace and workflow skills updated successfully.'
      : workspaceSuccess
        ? 'Workspace refreshed, but workflow skills update did not complete.'
        : 'Update failed.',
  };
}
