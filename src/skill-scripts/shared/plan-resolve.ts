import * as fs from 'fs';
import * as path from 'path';
import { findStrikethrooRoot } from './root';
import { getAllPlans } from './plan-scan';
import { extractPlanId } from './frontmatter';

export interface ResolvedPlan {
  planFile: string;
  planDir: string;
  strikethrooRoot: string;
  planId: number;
}

const isValidRootDir = (strikethrooPath: string): boolean => {
  try {
    if (!fs.existsSync(strikethrooPath)) return false;
    if (!fs.lstatSync(strikethrooPath).isDirectory()) return false;
    const metadataPath = path.join(strikethrooPath, '.init-metadata.json');
    if (!fs.existsSync(metadataPath)) return false;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return metadata && typeof metadata === 'object' && 'version' in metadata;
  } catch (_err) {
    return false;
  }
};

const checkStandardRootShortcut = (filePath: string): string | null => {
  const planDir = path.dirname(filePath);
  const parentDir = path.dirname(planDir);
  const possibleRoot = path.dirname(parentDir);

  const parentBase = path.basename(parentDir);
  if (parentBase !== 'plans' && parentBase !== 'archive') return null;
  if (path.basename(possibleRoot) !== 'strikethroo') return null;
  const dotAiDir = path.dirname(possibleRoot);
  if (path.basename(dotAiDir) !== '.ai') return null;

  return isValidRootDir(possibleRoot) ? possibleRoot : null;
};

const resolveByPath = (absolutePath: string): ResolvedPlan | null => {
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (_err) {
    return null;
  }
  const planId = extractPlanId(content, absolutePath);
  if (planId === null) return null;

  const tmRoot =
    checkStandardRootShortcut(absolutePath) || findStrikethrooRoot(path.dirname(absolutePath));
  if (!tmRoot) return null;

  return {
    planFile: absolutePath,
    planDir: path.dirname(absolutePath),
    strikethrooRoot: tmRoot,
    planId,
  };
};

const resolveByIdInAncestry = (
  planId: number,
  startPath: string,
  searched: Set<string> = new Set()
): ResolvedPlan | null => {
  const tmRoot = findStrikethrooRoot(startPath);
  if (!tmRoot) return null;

  const normalized = path.normalize(tmRoot);
  if (searched.has(normalized)) return null;
  searched.add(normalized);

  const plans = getAllPlans(tmRoot);
  const match = plans.find(p => p.id === planId);
  if (match) {
    return {
      planFile: match.file,
      planDir: match.dir,
      strikethrooRoot: tmRoot,
      planId,
    };
  }

  const parentOfRoot = path.dirname(path.dirname(tmRoot));
  if (parentOfRoot === tmRoot) return null;
  return resolveByIdInAncestry(planId, parentOfRoot, searched);
};

export const resolvePlan = (
  input: string | number,
  startPath: string = process.cwd()
): ResolvedPlan | null => {
  if (input === null || input === undefined || input === '') return null;
  const inputStr = String(input);

  if (inputStr.startsWith('/')) {
    return resolveByPath(inputStr);
  }

  const planId = parseInt(inputStr, 10);
  if (Number.isNaN(planId)) return null;

  return resolveByIdInAncestry(planId, startPath);
};
