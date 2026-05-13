import * as fs from 'fs';
import * as path from 'path';

const isValidTaskManagerRoot = (taskManagerPath: string): boolean => {
  try {
    if (!fs.existsSync(taskManagerPath)) return false;
    if (!fs.lstatSync(taskManagerPath).isDirectory()) return false;

    const metadataPath = path.join(taskManagerPath, '.init-metadata.json');
    if (!fs.existsSync(metadataPath)) return false;

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return metadata && typeof metadata === 'object' && 'version' in metadata;
  } catch (_err) {
    return false;
  }
};

const getTaskManagerAt = (directory: string): string | null => {
  const taskManagerPath = path.join(directory, '.ai', 'task-manager');
  return isValidTaskManagerRoot(taskManagerPath) ? taskManagerPath : null;
};

const getParentPaths = (currentPath: string, acc: string[] = []): string[] => {
  const absolutePath = path.resolve(currentPath);
  const nextAcc = [...acc, absolutePath];
  const parentPath = path.dirname(absolutePath);
  if (parentPath === absolutePath) return nextAcc;
  return getParentPaths(parentPath, nextAcc);
};

export const findTaskManagerRoot = (startPath: string = process.cwd()): string | null => {
  const paths = getParentPaths(startPath);
  const found = paths.find(p => getTaskManagerAt(p));
  return found ? getTaskManagerAt(found) : null;
};
