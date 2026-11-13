import { findStrikethrooRoot } from './shared/root';
import { checkForUpdates, emptyUpdateCheckResult } from './shared/update-check';

const main = async (): Promise<void> => {
  const startPath = process.argv[2] || process.cwd();
  let result = emptyUpdateCheckResult('0.0.0');
  try {
    const root = findStrikethrooRoot(startPath);
    if (root) result = await checkForUpdates(root);
  } catch {
    // Update checks are best-effort; failures never block a workflow.
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
};

if (require.main === module) {
  void main();
}

export { main };
