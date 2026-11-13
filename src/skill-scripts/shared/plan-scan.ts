import * as fs from 'fs';
import * as path from 'path';
import { extractPlanId, idFromName, nextIdAfter } from './frontmatter';
import { splitFrontmatter } from './task-frontmatter';

export interface PlanEntry {
  id: number;
  file: string;
  dir: string;
  isArchive: boolean;
  name: string;
}

const PLAN_EXTENSIONS = ['.md'];

/** Discovery can recover a named plan; validation still rejects its malformed metadata. */
export const discoverPlanId = (content: string, file: string): number | null => {
  const id = extractPlanId(content, file);
  if (id !== null) return id;
  const name = path.basename(file);
  if (!/^plan(?:-.*)?\.md$/.test(name) || splitFrontmatter(content).kind !== 'block') return null;
  return idFromName(path.basename(path.dirname(file))) ?? idFromName(name);
};

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
        const id = discoverPlanId(content, filePath);
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
  const ids: number[] = [];
  for (const source of ['plans', 'archive']) {
    const dir = path.join(taskManagerRoot, source);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const id = idFromName(entry.name);
      if (id !== null) ids.push(id);
      const planDir = path.join(dir, entry.name);
      for (const file of fs.readdirSync(planDir, { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith('.md')) continue;
        const filePath = path.join(planDir, file.name);
        const metadataId = extractPlanId(fs.readFileSync(filePath, 'utf8'), filePath);
        const nameId = idFromName(file.name);
        if (metadataId !== null) ids.push(metadataId);
        if (nameId !== null) ids.push(nameId);
      }
    }
  }
  return nextIdAfter(ids);
};
