/**
 * Plan Command Module
 *
 * Implements show and archive subcommands for plan inspection and management
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import * as readline from 'readline';
import chalk from 'chalk';
import { loadPlanData, findPlanById } from './plan-utils';

const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

/**
 * Format a section header
 */
function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}

/**
 * Create an ASCII progress bar
 */
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}] ${percentage}%`;
}

/**
 * Wrap text to specified width, preserving paragraphs
 */
function wrapText(text: string, maxWidth: number): string {
  const paragraphs = text.split('\n\n');

  return paragraphs
    .map(paragraph => {
      const words = paragraph.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Prompt user for yes/no confirmation
 */
async function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Display plan metadata, executive summary, and task statistics
 */
export async function showPlan(planId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const planData = await loadPlanData(planId);

    if (!planData) {
      return {
        success: false,
        message: `Plan ${planId} not found. Check .ai/strikethroo/plans/ and .ai/strikethroo/archive/`,
      };
    }

    // Build output
    let output = '';

    // Header
    output += chalk.bold.white(`\nPlan ${planData.id}\n`);
    output += chalk.gray(DIVIDER) + '\n';

    // Metadata section
    output += formatSectionHeader('Metadata');
    output += `  ${chalk.cyan('●')} ID: ${planData.id}\n`;
    output += `  ${chalk.cyan('●')} Created: ${planData.created}\n`;
    output += `  ${chalk.cyan('●')} Status: ${planData.isArchived ? chalk.blue('Archived') : chalk.green('Active')}\n`;
    output += `  ${chalk.cyan('●')} Summary: ${planData.summary}\n`;
    output += `  ${chalk.cyan('●')} Approval: ${planData.approval_method ?? 'unset'}\n`;

    // Task statistics section
    const taskCount = planData.tasks.length;
    const completedCount = planData.tasks.filter(t => t.status === 'completed').length;
    const percentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    output += formatSectionHeader('Task Progress');
    if (taskCount > 0) {
      output += `  ${createProgressBar(percentage, 20)} ${completedCount}/${taskCount} tasks completed\n`;
    } else {
      output += `  ${chalk.gray('No tasks generated yet')}\n`;
    }

    // Executive Summary section
    output += formatSectionHeader('Executive Summary');

    // Word wrap the executive summary to 76 chars (80 - 4 for indent)
    const wrappedSummary = wrapText(planData.executiveSummary, 76);
    output +=
      wrappedSummary
        .split('\n')
        .map(line => `  ${line}`)
        .join('\n') + '\n';

    // Footer
    output += '\n' + chalk.gray(DIVIDER) + '\n';

    console.log(output);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to display plan: ${message}`,
    };
  }
}

/**
 * Delete a plan permanently from either active or archive directory
 */
export async function deletePlan(
  planId: number,
  autoConfirm: boolean = false
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. Find the plan
    const location = await findPlanById(planId);

    if (!location) {
      return {
        success: false,
        message: `Plan ${planId} not found. Check .ai/strikethroo/plans/ and .ai/strikethroo/archive/ directories.`,
      };
    }

    // 2. Prompt for confirmation (unless autoConfirm is true)
    if (!autoConfirm) {
      const planType = location.isArchived ? 'archived' : 'active';
      console.log(
        chalk.yellow(
          `\n⚠  Warning: This will permanently delete ${planType} plan ${planId} and all its tasks.\n`
        )
      );

      const confirmed = await promptConfirmation('Delete plan? (y/n): ');
      if (!confirmed) {
        return { success: false, message: 'Deletion cancelled by user.' };
      }
    }

    // 3. Delete the directory
    await fs.remove(location.directoryPath);

    // 4. Display success message
    console.log(chalk.green(`\n✓ Plan ${planId} successfully deleted.\n`));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to delete plan: ${message}`,
    };
  }
}

/**
 * Archive a plan by moving it to the archive directory
 */
export async function archivePlan(
  planId: number,
  autoConfirm: boolean = false
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. Find and validate plan location
    const location = await findPlanById(planId);

    if (!location) {
      return {
        success: false,
        message: `Plan ${planId} not found. Check .ai/strikethroo/plans/ directory.`,
      };
    }

    if (location.isArchived) {
      return {
        success: false,
        message: `Plan ${planId} is already archived.`,
      };
    }

    // 2. Load plan data to check for incomplete tasks
    const planData = await loadPlanData(planId);
    if (!planData) {
      return { success: false, message: `Failed to load plan ${planId} data.` };
    }

    const incompleteTasks = planData.tasks.filter(t => t.status !== 'completed');

    // 3. Warn user if incomplete tasks exist
    if (incompleteTasks.length > 0 && !autoConfirm) {
      console.log(
        chalk.yellow(
          `\n⚠  Warning: Plan ${planId} has ${incompleteTasks.length} incomplete task(s).\n`
        )
      );

      const confirmed = await promptConfirmation('Archive anyway? (y/n): ');
      if (!confirmed) {
        return { success: false, message: 'Archive cancelled by user.' };
      }
    }

    // 4. Update all task files to completed status
    const tasksDir = path.join(location.directoryPath, 'tasks');
    if (await fs.pathExists(tasksDir)) {
      const taskFiles = await fs.readdir(tasksDir);

      for (const file of taskFiles) {
        if (!file.endsWith('.md')) continue;

        const taskPath = path.join(tasksDir, file);
        const content = await fs.readFile(taskPath, 'utf-8');
        const parsed = matter(content);

        // Update status to completed
        parsed.data.status = 'completed';

        // Write back with updated frontmatter
        const updated = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(taskPath, updated, 'utf-8');
      }
    }

    // 5. Append "Manually archived" note to plan document
    const planContent = await fs.readFile(location.filePath, 'utf-8');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const archiveNote = `\n---\n\n**Note**: Manually archived on ${today}\n`;
    const updatedContent = planContent + archiveNote;
    await fs.writeFile(location.filePath, updatedContent, 'utf-8');

    // 6. Move plan directory to archive
    const baseDir = process.cwd();
    const archiveDir = path.join(baseDir, '.ai/strikethroo/archive');
    await fs.ensureDir(archiveDir);

    const planDirName = path.basename(location.directoryPath);
    const archivePath = path.join(archiveDir, planDirName);

    await fs.move(location.directoryPath, archivePath);

    // 7. Display success message
    console.log(
      chalk.green(
        `\n✓ Plan ${planId} successfully archived to .ai/strikethroo/archive/${planDirName}\n`
      )
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to archive plan: ${message}`,
    };
  }
}
