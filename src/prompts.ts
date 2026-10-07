/**
 * Interactive Prompts for Conflict Resolution
 *
 * This file handles user interaction when file conflicts are detected,
 * displaying unified diffs and collecting resolution decisions
 */

import inquirer from 'inquirer';
import { createTwoFilesPatch } from 'diff';
import chalk from 'chalk';
import { FileConflict, ConflictResolution } from './types';
import { NO_RECORDED_BASELINE } from './conflict-detector';

/** Whether the destination has no recorded baseline to compare against. */
function isUntracked(conflict: FileConflict): boolean {
  return conflict.originalHash === NO_RECORDED_BASELINE;
}

/**
 * Explain why a session that cannot prompt refuses to continue.
 *
 * Names every conflicting path so the user can inspect them, says which ones
 * have no recorded baseline, and names the two ways forward.
 */
function describeNonInteractiveRefusal(conflicts: FileConflict[]): string {
  const untracked = conflicts.filter(isUntracked);
  const lines = [
    `${conflicts.length} file(s) under .ai/strikethroo/config/ differ from the incoming version and ` +
      'need a decision, but standard input is not an interactive terminal so none can be asked:',
    ...conflicts.map(
      conflict => `  ${conflict.relativePath}${isUntracked(conflict) ? ' (not tracked)' : ''}`
    ),
  ];
  if (untracked.length > 0) {
    lines.push(
      `${untracked.length} of them have no recorded baseline in .init-metadata.json, so the metadata ` +
        'cannot be trusted to tell a customization from a stale copy.'
    );
  }
  lines.push(
    'Re-run in a terminal to decide per file, or pass --force to overwrite every conflicting ' +
      'file with the incoming version.'
  );
  return lines.join('\n');
}

/**
 * Format and colorize a unified diff for display
 * @param diff - Unified diff string from diff library
 * @returns Colorized diff string
 */
function formatDiff(diff: string): string {
  const lines = diff.split('\n');
  return lines
    .map(line => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        return chalk.bold(line);
      } else if (line.startsWith('+')) {
        return chalk.green(line);
      } else if (line.startsWith('-')) {
        return chalk.red(line);
      } else if (line.startsWith('@@')) {
        return chalk.cyan(line);
      }
      return line;
    })
    .join('\n');
}

/**
 * Generate a unified diff between user's file and new file
 * @param conflict - FileConflict object with user and new file contents
 * @returns Formatted unified diff string
 */
function generateDiff(conflict: FileConflict): string {
  const diff = createTwoFilesPatch(
    `${conflict.relativePath} (your version)`,
    `${conflict.relativePath} (new version)`,
    conflict.userFileContent,
    conflict.newFileContent,
    '',
    '',
    { context: 3 }
  );

  return formatDiff(diff);
}

/**
 * Prompt user for resolution of a single file conflict
 * @param conflict - FileConflict object to resolve
 * @param remainingCount - Number of conflicts remaining after this one
 * @returns User's resolution choice
 */
export async function promptForResolution(
  conflict: FileConflict,
  remainingCount: number
): Promise<ConflictResolution> {
  console.log('');
  console.log(chalk.bold.yellow('⚠️  File Conflict Detected'));
  console.log('');
  if (isUntracked(conflict)) {
    console.log(
      chalk.bold(
        `File: ${chalk.cyan(conflict.relativePath)} is not tracked in .init-metadata.json.`
      )
    );
    console.log(
      chalk.yellow(
        'There is no record of what Strikethroo last wrote here, and the file differs from the ' +
          'incoming version. It will be lost if you overwrite it.'
      )
    );
  } else {
    console.log(
      chalk.bold(`File: ${chalk.cyan(conflict.relativePath)} has been modified since last init.`)
    );
    console.log(
      chalk.yellow('Your changes will be lost if you choose to overwrite with the new version.')
    );
  }
  console.log('');

  // Generate and display unified diff
  const diff = generateDiff(conflict);
  console.log(diff);
  console.log('');

  // Build choices based on remaining conflicts
  const choices: { name: string; value: ConflictResolution }[] = [
    {
      name: isUntracked(conflict)
        ? 'Keep the existing file (skip update)'
        : 'Keep my changes (skip update)',
      value: 'keep',
    },
    {
      name: 'Overwrite with new version',
      value: 'overwrite',
    },
  ];

  // Add batch options if there are more conflicts
  if (remainingCount > 0) {
    choices.push(
      {
        name: `Keep my changes for all remaining conflicts (${remainingCount + 1} files)`,
        value: 'keep-all',
      },
      {
        name: `Overwrite all remaining conflicts (${remainingCount + 1} files)`,
        value: 'overwrite-all',
      }
    );
  }

  const answer = await inquirer.prompt<{ resolution: ConflictResolution }>([
    {
      type: 'list',
      name: 'resolution',
      message: 'What would you like to do?',
      choices,
    },
  ]);

  return answer.resolution;
}

/**
 * Process all file conflicts with user prompts
 *
 * Refuses up front when standard input is not a terminal: a prompt that cannot
 * be answered must not be rendered, and the caller treats the thrown error as
 * a failed refresh with nothing written. `--force` is the non-interactive route.
 *
 * @param conflicts - Array of FileConflict objects
 * @returns Map of relative paths to resolution decisions
 * @throws Error when conflicts exist and the session cannot prompt
 */
export async function promptForConflicts(
  conflicts: FileConflict[]
): Promise<Map<string, ConflictResolution>> {
  if (conflicts.length > 0 && !process.stdin.isTTY) {
    throw new Error(describeNonInteractiveRefusal(conflicts));
  }

  const resolutions = new Map<string, ConflictResolution>();
  let batchResolution: ConflictResolution | null = null;

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i];
    if (!conflict) continue; // TypeScript safety check

    const remainingCount = conflicts.length - i - 1;

    // If batch resolution was set, apply it
    if (batchResolution) {
      const resolution = batchResolution === 'keep-all' ? 'keep' : 'overwrite';
      resolutions.set(conflict.relativePath, resolution);
      continue;
    }

    // Prompt user for this conflict
    const resolution = await promptForResolution(conflict, remainingCount);

    // Handle batch resolutions
    if (resolution === 'keep-all' || resolution === 'overwrite-all') {
      batchResolution = resolution;
      const individualResolution = resolution === 'keep-all' ? 'keep' : 'overwrite';
      resolutions.set(conflict.relativePath, individualResolution);
    } else {
      resolutions.set(conflict.relativePath, resolution);
    }
  }

  return resolutions;
}
