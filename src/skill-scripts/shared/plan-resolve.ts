import * as fs from 'fs';
import * as path from 'path';
import { checkWorkspaceSchema, findStrikethrooRoot } from './root';
import { getAllPlans } from './plan-scan';
import { extractPlanId } from './frontmatter';

export interface ResolvedPlan {
  planFile: string;
  planDir: string;
  strikethrooRoot: string;
  planId: number;
}

/** How `resolvePlan` reads its first argument. */
export type PlanInput =
  | { readonly kind: 'path'; readonly planFile: string }
  | { readonly kind: 'id'; readonly planId: number }
  | { readonly kind: 'invalid' };

/**
 * An absolute path addresses one plan file; anything else that parses as an
 * integer is a plan id. A relative path is neither, and stays invalid.
 *
 * `isAbsolute` is a parameter only so each platform's rule can be exercised
 * from the other platform's host.
 */
export const _classifyPlanInput = (
  input: string | number | null | undefined,
  isAbsolute: (candidate: string) => boolean = path.isAbsolute
): PlanInput => {
  if (input === null || input === undefined || input === '') return { kind: 'invalid' };
  const candidate = String(input);
  if (isAbsolute(candidate)) return { kind: 'path', planFile: candidate };
  const planId = parseInt(candidate, 10);
  return Number.isNaN(planId) ? { kind: 'invalid' } : { kind: 'id', planId };
};

/**
 * Structural checks only — the schema verdict belongs to `checkWorkspaceSchema`.
 * `lstat` rather than `stat`: a symlinked workspace root is refused.
 */
const isValidRootDir = (strikethrooPath: string): boolean => {
  try {
    if (!fs.existsSync(strikethrooPath)) return false;
    if (!fs.lstatSync(strikethrooPath).isDirectory()) return false;
    const metadataPath = path.join(strikethrooPath, '.init-metadata.json');
    if (!fs.existsSync(metadataPath)) return false;
    const metadata: unknown = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return typeof metadata === 'object' && metadata !== null;
  } catch (_err) {
    return false;
  }
};

/** Locator for the standard `<project>/.ai/strikethroo/{plans,archive}/<plan>/` layout. */
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

/**
 * The layout shortcut only locates a root, so it is routed through the same
 * schema gate `findStrikethrooRoot` applies. One gate, both routes.
 */
const locateRootForPlanFile = (planFile: string): string | null => {
  const shortcut = checkStandardRootShortcut(planFile);
  if (!shortcut) return findStrikethrooRoot(path.dirname(planFile));
  checkWorkspaceSchema(shortcut);
  return shortcut;
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

  const tmRoot = locateRootForPlanFile(absolutePath);
  if (!tmRoot) return null;

  return {
    planFile: absolutePath,
    planDir: path.dirname(absolutePath),
    strikethrooRoot: tmRoot,
    planId,
  };
};

/**
 * Plan ids address the nearest discovered workspace and nothing beyond it; an
 * explicit absolute path is the deliberate route to another workspace.
 */
const resolveById = (planId: number, startPath: string): ResolvedPlan | null => {
  const tmRoot = findStrikethrooRoot(startPath);
  if (!tmRoot) return null;

  const match = getAllPlans(tmRoot).find(p => p.id === planId);
  if (!match) return null;

  return {
    planFile: match.file,
    planDir: match.dir,
    strikethrooRoot: tmRoot,
    planId,
  };
};

export const resolvePlan = (
  input: string | number,
  startPath: string = process.cwd()
): ResolvedPlan | null => {
  const classified = _classifyPlanInput(input);
  switch (classified.kind) {
    case 'path':
      return resolveByPath(classified.planFile);
    case 'id':
      return resolveById(classified.planId, startPath);
    case 'invalid':
      return null;
  }
};
