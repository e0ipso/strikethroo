import { findStrikethrooRoot } from './shared/root';
import { computeNextPlanId } from './shared/plan-scan';

const main = (): void => {
  const rootArg = process.argv[2];
  let root: string | null;
  if (rootArg) {
    root = rootArg;
  } else {
    root = findStrikethrooRoot(process.cwd());
  }
  if (!root) {
    process.stderr.write(
      'No .ai/strikethroo root found. Run this from inside an initialized strikethroo workspace.\n'
    );
    process.exit(1);
  }
  process.stdout.write(`${computeNextPlanId(root)}\n`);
  process.exit(0);
};

if (require.main === module) {
  main();
}

export { main };
