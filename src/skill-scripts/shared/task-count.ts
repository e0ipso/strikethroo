import * as fs from 'fs';
import * as path from 'path';

export const countTaskFiles = (planDir: string): number => {
  const tasksDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return 0;
  try {
    const stat = fs.lstatSync(tasksDir);
    if (!stat.isDirectory()) return 0;
    return fs.readdirSync(tasksDir).filter(f => f.endsWith('.md')).length;
  } catch (_err) {
    return 0;
  }
};
