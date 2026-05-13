import * as fs from 'fs';
import * as path from 'path';
import { extractPlanId } from './frontmatter';

export const computeNextTaskId = (planDir: string): number => {
  const tasksDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return 1;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  } catch (_err) {
    return 1;
  }
  if (entries.length === 0) return 1;

  const ids = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .flatMap(e => {
      const filePath = path.join(tasksDir, e.name);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const id = extractPlanId(content, filePath);
        return id === null ? [] : [id];
      } catch (_err) {
        return [];
      }
    });

  const max = ids.reduce((acc, id) => Math.max(acc, id), 0);
  return max + 1;
};
