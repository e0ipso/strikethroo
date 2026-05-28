/**
 * Plan Utilities Module
 *
 * Provides functions for locating plans, loading plan data, and extracting content
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { PlanMetadata, parseTaskFiles } from './status';

/**
 * Location information for a plan
 */
export interface PlanLocation {
  planId: number;
  directoryPath: string;
  filePath: string;
  isArchived: boolean;
}

/**
 * Extended plan data including body content
 */
export interface PlanData extends PlanMetadata {
  bodyContent: string;
  executiveSummary: string;
}

/**
 * Find a plan by ID in either plans/ or archive/ directories
 */
export async function findPlanById(planId: number): Promise<PlanLocation | null> {
  const baseDir = process.cwd();
  const searchDirs = [
    { path: path.join(baseDir, '.ai/strikethroo/plans'), archived: false },
    { path: path.join(baseDir, '.ai/strikethroo/archive'), archived: true },
  ];

  for (const searchDir of searchDirs) {
    if (!(await fs.pathExists(searchDir.path))) continue;

    const entries = await fs.readdir(searchDir.path, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const planDir = path.join(searchDir.path, entry.name);
      const files = await fs.readdir(planDir);
      const planFile = files.find(f => f.startsWith('plan-') && f.endsWith('.md'));

      if (!planFile) continue;

      const filePath = path.join(planDir, planFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      if (data.id === planId) {
        return {
          planId,
          directoryPath: planDir,
          filePath,
          isArchived: searchDir.archived,
        };
      }
    }
  }

  return null;
}

/**
 * Extract Executive Summary section from markdown content
 */
export function extractExecutiveSummary(markdown: string): string {
  // Match from "## Executive Summary" to next ## heading or end of file
  const regex = /## Executive Summary\n+([\s\S]*?)(?=\n## |$)/;
  const match = markdown.match(regex);

  if (!match || !match[1]) {
    return 'No Executive Summary found.';
  }

  // Trim whitespace and return
  return match[1].trim();
}

/**
 * Load complete plan data including metadata, tasks, and content
 */
export async function loadPlanData(planId: number): Promise<PlanData | null> {
  const location = await findPlanById(planId);
  if (!location) return null;

  const content = await fs.readFile(location.filePath, 'utf-8');
  const { data, content: bodyContent } = matter(content);

  const tasks = await parseTaskFiles(location.directoryPath);
  const executiveSummary = extractExecutiveSummary(bodyContent);

  return {
    id: data.id,
    summary: data.summary,
    created: data.created,
    approval_method: data.approval_method,
    isArchived: location.isArchived,
    directoryPath: location.directoryPath,
    tasks,
    bodyContent,
    executiveSummary,
  };
}
