import { findStrikethrooRoot } from './shared/root';
import { checkForUpdates, type UpdateCheckResult } from './shared/update-check';

const main = async (): Promise<void> => {
  const startPath = process.argv[2] || process.cwd();
  let result: UpdateCheckResult;
  try {
    const root = findStrikethrooRoot(startPath);
    if (!root) {
      result = {
        noticeEligible: false,
        needsHarnessPrompt: false,
        updateCommand: 'npx strikethroo@latest update',
        latestRelease: null,
        workspaceVersion: null,
        skillVersion: '0.0.0',
        workspaceDisposition: 'unknown',
        skillDisposition: 'unknown',
      };
    } else {
      result = await checkForUpdates(root);
    }
  } catch {
    result = {
      noticeEligible: false,
      needsHarnessPrompt: false,
      updateCommand: 'npx strikethroo@latest update',
      latestRelease: null,
      workspaceVersion: null,
      skillVersion: '0.0.0',
      workspaceDisposition: 'unknown',
      skillDisposition: 'unknown',
    };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
};

if (require.main === module) {
  void main();
}

export { main };
