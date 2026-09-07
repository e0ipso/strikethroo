/**
 * Unified update command: refresh workspace via init, then update workflow skills.
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { stripVTControlCharacters } from 'util';
import type { Writable } from 'stream';
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
// This version's zero-exit failure messages are part of the adapter contract.
export const SKILLS_INSTALLER_PACKAGE = 'skills@1.5.24';
export const SKILLS_INSTALLER_STDIO = ['inherit', 'pipe', 'pipe'] as const;

/**
 * Exact installer package and arguments passed to npx.
 */
export function buildSkillsInstallerArgs(): string[] {
  return [SKILLS_INSTALLER_PACKAGE, 'update', ...STRIKETHROO_WORKFLOW_SKILLS];
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
 * Preserve interactive input and stream output while detecting zero-exit failures.
 */
export async function runSkillsInstaller(cwd: string): Promise<{ success: boolean; code: number }> {
  return new Promise(resolve => {
    let incomplete = false;
    const observe = (destination: Writable): ((chunk: string) => void) => {
      let tail = '';
      return chunk => {
        destination.write(chunk);
        const text = stripVTControlCharacters(tail + chunk);
        if (
          /Cancelled|No installed skills found matching:|cannot be (?:checked|updated) automatically|No project skills can be updated in place|✗ Failed to check/i.test(
            text
          )
        ) {
          incomplete = true;
        }
        tail = text.slice(-1024);
      };
    };
    const child = spawn(SKILLS_INSTALLER_EXECUTABLE, buildSkillsInstallerArgs(), {
      cwd,
      shell: false,
      stdio: [...SKILLS_INSTALLER_STDIO],
      env: process.env,
    });
    child.stdout?.setEncoding('utf8').on('data', observe(process.stdout));
    child.stderr?.setEncoding('utf8').on('data', observe(process.stderr));

    child.on('error', () => {
      resolve({ success: false, code: 1 });
    });

    child.on('close', code => {
      const success = code === 0 && !incomplete;
      resolve({ success, code: success ? 0 : code || 1 });
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
      '  The installer checks matching project and global skills. Incomplete installs keep the refreshed workspace.'
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
