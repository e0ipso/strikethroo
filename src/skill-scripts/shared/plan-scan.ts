import * as fs from 'fs';
import * as path from 'path';
import { extractPlanId } from './frontmatter';

export interface PlanEntry {
  id: number;
  file: string;
  dir: string;
  isArchive: boolean;
  name: string;
}

const PLAN_EXTENSIONS = ['.md'];

const scanPlanDir = (planDirPath: string, dirName: string, isArchive: boolean): PlanEntry[] => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(planDirPath, { withFileTypes: true });
  } catch (_err) {
    return [];
  }

  return entries
    .filter(e => e.isFile() && PLAN_EXTENSIONS.some(ext => e.name.endsWith(ext)))
    .flatMap(e => {
      const filePath = path.join(planDirPath, e.name);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const id = extractPlanId(content, filePath);
        if (id === null) return [];
        return [{ id, file: filePath, dir: planDirPath, isArchive, name: dirName }];
      } catch (_err) {
        return [];
      }
    });
};

export const getAllPlans = (taskManagerRoot: string): PlanEntry[] => {
  const sources = [
    { dir: path.join(taskManagerRoot, 'plans'), isArchive: false },
    { dir: path.join(taskManagerRoot, 'archive'), isArchive: true },
  ];

  return sources.flatMap(({ dir, isArchive }) => {
    if (!fs.existsSync(dir)) return [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_err) {
      return [];
    }
    return entries
      .filter(e => e.isDirectory())
      .flatMap(e => scanPlanDir(path.join(dir, e.name), e.name, isArchive));
  });
};

export const computeNextPlanId = (taskManagerRoot: string): number => {
  const plans = getAllPlans(taskManagerRoot);
  return plans.reduce((max, p) => Math.max(max, p.id), 0) + 1;
};
