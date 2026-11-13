import * as fs from 'fs';
import * as path from 'path';
import { extractPlanId, idFromName, nextIdAfter } from './frontmatter';

export const computeNextTaskId = (planDir: string): number => {
  const tasksDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return 1;

  const ids = fs
    .readdirSync(tasksDir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .flatMap(e => {
      const filePath = path.join(tasksDir, e.name);
      const content = fs.readFileSync(filePath, 'utf8');
      return [extractPlanId(content, filePath), idFromName(e.name)].filter(
        (id): id is number => id !== null
      );
    });
  return nextIdAfter(ids);
};
