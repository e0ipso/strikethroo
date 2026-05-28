/**
 * Status Dashboard Module
 *
 * This module provides functionality to display a dashboard with plans and task statistics
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';

/**
 * Metadata extracted from task files
 */
export interface TaskMetadata {
  id: number;
  status: 'pending' | 'in-progress' | 'completed' | 'needs-clarification';
}

/**
 * Metadata extracted from plan files
 */
export interface PlanMetadata {
  id: number;
  summary: string;
  created: string;
  approval_method?: string;
  isArchived: boolean;
  directoryPath: string;
  tasks: TaskMetadata[];
}

/**
 * Scan the plans directory and return all plan directories
 */
async function scanPlansDirectory(baseDir: string): Promise<string[]> {
  const plansDir = path.join(baseDir, '.ai/strikethroo/plans');
  if (!(await fs.pathExists(plansDir))) return [];

  const entries = await fs.readdir(plansDir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => path.join(plansDir, entry.name));
}

/**
 * Scan the archive directory and return all archived plan directories
 */
async function scanArchiveDirectory(baseDir: string): Promise<string[]> {
  const archiveDir = path.join(baseDir, '.ai/strikethroo/archive');
  if (!(await fs.pathExists(archiveDir))) return [];

  const entries = await fs.readdir(archiveDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(archiveDir, entry.name));
}

/**
 * Parse a plan file and extract metadata
 */
async function parsePlanFile(planDir: string): Promise<PlanMetadata | null> {
  try {
    const files = await fs.readdir(planDir);
    const planFile = files.find(f => f.startsWith('plan-') && f.endsWith('.md'));
    if (!planFile) return null;

    const content = await fs.readFile(path.join(planDir, planFile), 'utf-8');
    const { data } = matter(content);

    return {
      id: data.id,
      summary: data.summary,
      created: data.created,
      approval_method: data.approval_method,
      isArchived: planDir.includes('/archive/'),
      directoryPath: planDir,
      tasks: [],
    };
  } catch (_error) {
    const planName = path.basename(planDir);
    console.warn(
      chalk.yellow(
        `Warning: Skipping corrupted plan in ${planName}. Check the plan file's YAML frontmatter.`
      )
    );
    return null;
  }
}

/**
 * Parse task files in a plan directory
 */
export async function parseTaskFiles(planDir: string): Promise<TaskMetadata[]> {
  const tasksDir = path.join(planDir, 'tasks');
  if (!(await fs.pathExists(tasksDir))) return [];

  try {
    const taskFiles = await fs.readdir(tasksDir);
    const tasks: TaskMetadata[] = [];

    for (const file of taskFiles) {
      if (!file.endsWith('.md')) continue;

      try {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
        const { data } = matter(content);
        tasks.push({
          id: data.id,
          status: data.status,
        });
      } catch (_err) {
        const planName = path.basename(planDir);
        console.warn(
          chalk.yellow(
            `Warning: Skipping corrupted task file ${file} in ${planName}. Fix by checking for duplicate or invalid YAML frontmatter fields.`
          )
        );
      }
    }

    return tasks.sort((a, b) => a.id - b.id);
  } catch (_error) {
    const planName = path.basename(planDir);
    console.warn(
      chalk.yellow(
        `Warning: Could not read tasks directory in ${planName}. Check directory permissions.`
      )
    );
    return [];
  }
}

/**
 * Collect all plan data from the filesystem
 */
export async function collectPlanData(): Promise<PlanMetadata[]> {
  const baseDir = process.cwd();
  const plans: PlanMetadata[] = [];

  // Collect active plans
  const activeDirs = await scanPlansDirectory(baseDir);
  for (const dir of activeDirs) {
    const plan = await parsePlanFile(dir);
    if (plan) {
      plan.tasks = await parseTaskFiles(dir);
      plans.push(plan);
    }
  }

  // Collect archived plans
  const archiveDirs = await scanArchiveDirectory(baseDir);
  for (const dir of archiveDirs) {
    const plan = await parsePlanFile(dir);
    if (plan) {
      plan.tasks = await parseTaskFiles(dir);
      plans.push(plan);
    }
  }

  return plans.sort((a, b) => a.id - b.id);
}

// ============================================================================
// STATISTICS CALCULATION (Task 03)
// ============================================================================

/**
 * Plan status categorization
 */
export type PlanStatus = 'noTasks' | 'notStarted' | 'inProgress' | 'completed';

/**
 * Dashboard statistics interface
 */
export interface DashboardStatistics {
  totalPlans: number;
  activePlans: number;
  archivedPlans: number;
  taskCompletionRate: number;
  plansByStatus: {
    noTasks: number;
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  mostRecentPlan?: PlanMetadata;
  oldestPlan?: PlanMetadata;
}

/**
 * Calculate basic plan counts
 */
function calculateBasicCounts(plans: PlanMetadata[]): {
  total: number;
  active: number;
  archived: number;
} {
  return {
    total: plans.length,
    active: plans.filter(p => !p.isArchived).length,
    archived: plans.filter(p => p.isArchived).length,
  };
}

/**
 * Calculate task completion rate across all plans (active + archived)
 */
function calculateTaskCompletionRate(plans: PlanMetadata[]): number {
  let totalTasks = 0;
  let completedTasks = 0;

  for (const plan of plans) {
    totalTasks += plan.tasks.length;
    completedTasks += plan.tasks.filter(t => t.status === 'completed').length;
  }

  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Categorize a single plan's status
 */
export function categorizePlanStatus(plan: PlanMetadata): PlanStatus {
  if (plan.tasks.length === 0) return 'noTasks';

  const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
  const pendingCount = plan.tasks.filter(t => t.status === 'pending').length;

  if (completedCount === plan.tasks.length) return 'completed';
  if (pendingCount === plan.tasks.length) return 'notStarted';
  return 'inProgress';
}

/**
 * Calculate plan status distribution
 */
function calculatePlanStatusDistribution(plans: PlanMetadata[]) {
  const distribution = {
    noTasks: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
  };

  for (const plan of plans) {
    const status = categorizePlanStatus(plan);
    distribution[status]++;
  }

  return distribution;
}

/**
 * Find most recent and oldest plans
 */
function findTimelinePlans(plans: PlanMetadata[]): {
  mostRecent?: PlanMetadata;
  oldest?: PlanMetadata;
} {
  if (plans.length === 0) return {};

  const sorted = [...plans].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return {
    mostRecent: sorted[0],
    oldest: sorted[sorted.length - 1],
  };
}

/**
 * Calculate all dashboard statistics
 */
export function calculateStatistics(plans: PlanMetadata[]): DashboardStatistics {
  const counts = calculateBasicCounts(plans);
  const timeline = findTimelinePlans(plans);

  return {
    totalPlans: counts.total,
    activePlans: counts.active,
    archivedPlans: counts.archived,
    taskCompletionRate: calculateTaskCompletionRate(plans),
    plansByStatus: calculatePlanStatusDistribution(plans.filter(p => !p.isArchived)),
    mostRecentPlan: timeline.mostRecent,
    oldestPlan: timeline.oldest,
  };
}

// ============================================================================
// VISUAL FORMATTING (Task 04)
// ============================================================================

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
 * Format the summary section
 */
function formatSummary(stats: DashboardStatistics): string {
  let output = formatSectionHeader('Summary');

  output += `  ${chalk.cyan('●')} Total Plans: ${stats.totalPlans}\n`;
  output += `  ${chalk.green('●')} Active Plans: ${stats.activePlans}\n`;
  output += `  ${chalk.blue('●')} Archived Plans: ${stats.archivedPlans}\n`;
  output += `  ${chalk.magenta('●')} Task Progress: ${createProgressBar(stats.taskCompletionRate)} (${stats.taskCompletionRate}% complete)\n`;

  return output;
}

/**
 * Format the active plans section
 */
function formatActivePlans(plans: PlanMetadata[]): string {
  const activePlans = plans.filter(p => !p.isArchived);

  if (activePlans.length === 0) {
    return formatSectionHeader('Active Plans') + '  No active plans\n';
  }

  let output = formatSectionHeader('Active Plans');

  for (const plan of activePlans) {
    const taskCount = plan.tasks.length;
    const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
    const percentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    const summary = plan.summary.length > 50 ? plan.summary.substring(0, 47) + '...' : plan.summary;

    output += `  ${chalk.yellow('●')} ${chalk.bold(`Plan ${plan.id}`)}: ${summary}\n`;

    if (taskCount > 0) {
      output += `      ${createProgressBar(percentage, 20)} ${completedCount}/${taskCount} tasks\n`;
    } else {
      output += `      ${chalk.gray('No tasks generated')}\n`;
    }
  }

  return output;
}

/**
 * Format archived plans with unfinished tasks section
 */
function formatIncompleteArchivedPlans(plans: PlanMetadata[]): string {
  const archivedPlans = plans.filter(p => p.isArchived);
  const incompleteArchived = archivedPlans.filter(
    p => p.tasks.length > 0 && p.tasks.some(t => t.status !== 'completed')
  );

  if (incompleteArchived.length === 0) {
    return '';
  }

  let output = formatSectionHeader('Unfinished Tasks in Archived Plans');

  for (const plan of incompleteArchived) {
    const taskCount = plan.tasks.length;
    const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
    const incompleteCount = taskCount - completedCount;
    const percentage = Math.round((completedCount / taskCount) * 100);

    const summary = plan.summary.length > 50 ? plan.summary.substring(0, 47) + '...' : plan.summary;

    output += `  ${chalk.red('⚠')} ${chalk.bold(`Plan ${plan.id}`)}: ${summary}\n`;
    output += `      ${createProgressBar(percentage, 20)} ${incompleteCount} incomplete task${incompleteCount !== 1 ? 's' : ''}\n`;
  }

  return output;
}

/**
 * Format the archived plans section
 */
function formatArchivedPlans(plans: PlanMetadata[]): string {
  const archivedPlans = plans.filter(p => p.isArchived);

  if (archivedPlans.length === 0) {
    return formatSectionHeader('Archived Plans') + '  No archived plans\n';
  }

  let output = formatSectionHeader('Archived Plans');

  for (const plan of archivedPlans) {
    const summary = plan.summary.length > 60 ? plan.summary.substring(0, 57) + '...' : plan.summary;

    output += `  ${chalk.green('✓')} ${chalk.bold(`Plan ${plan.id}`)}: ${summary}\n`;
  }

  return output;
}

/**
 * Format the complete dashboard
 */
export function formatDashboard(stats: DashboardStatistics, plans: PlanMetadata[]): string {
  let output = '';

  output += chalk.bold.white('\nStrikethroo Dashboard\n');
  output += chalk.gray(DIVIDER) + '\n';

  output += formatSummary(stats);
  output += formatActivePlans(plans);

  const incompleteSection = formatIncompleteArchivedPlans(plans);
  if (incompleteSection) {
    output += incompleteSection;
  }

  output += formatArchivedPlans(plans);

  output += '\n' + chalk.gray(DIVIDER) + '\n';

  return output;
}

// ============================================================================
// MAIN STATUS FUNCTION (Task 05)
// ============================================================================

/**
 * Main status function that orchestrates all components
 */
export async function status(): Promise<{ success: boolean; message?: string }> {
  try {
    const plans = await collectPlanData();
    const stats = calculateStatistics(plans);
    const dashboard = formatDashboard(stats, plans);

    console.log(dashboard);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to generate dashboard: ${message}`,
    };
  }
}
