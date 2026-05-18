import { execSync } from 'child_process';

export const execGit = (command: string): string | null => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (_error) {
    return null;
  }
};
