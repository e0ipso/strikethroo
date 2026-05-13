import { resolvePlan } from './shared/plan-resolve';
import { computeNextTaskId } from './shared/task-scan';

const main = (): void => {
  const inputId = process.argv[2];
  if (!inputId) {
    process.stderr.write('Error: Plan ID or path is required\n');
    process.exit(1);
  }

  const resolved = resolvePlan(inputId);
  if (!resolved) {
    process.stderr.write(`Error: Plan "${inputId}" not found or invalid.\n`);
    process.exit(1);
  }

  process.stdout.write(`${computeNextTaskId(resolved.planDir)}\n`);
  process.exit(0);
};

if (require.main === module) {
  main();
}

export { main };
