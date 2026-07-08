import { findStrikethrooRoot } from './shared/root';
import { getAllPlans } from './shared/plan-scan';
import { resolvePlan } from './shared/plan-resolve';
import { hasExecutionBlueprint } from './shared/blueprint-detection';
import { countTaskFiles } from './shared/task-count';
import { validateTaskComplexityScores } from './shared/task-complexity';

interface ValidationResult {
  planFile: string;
  planDir: string;
  strikethrooRoot: string;
  planId: number;
  taskCount: number;
  blueprintExists: 'yes' | 'no';
  complexityScoresValid: 'yes' | 'no';
  invalidComplexityTasks: string;
}

const VALID_FIELDS: ReadonlyArray<keyof ValidationResult> = [
  'planFile',
  'planDir',
  'taskCount',
  'blueprintExists',
  'strikethrooRoot',
  'planId',
  'complexityScoresValid',
  'invalidComplexityTasks',
];

const usage = (): void => {
  const lines = [
    'Plan ID or absolute path is required',
    '',
    'Usage: node validate-plan-blueprint.cjs <plan-id-or-path> [field-name]',
    '',
    'Examples:',
    '  node validate-plan-blueprint.cjs 47',
    '  node validate-plan-blueprint.cjs /path/to/plan.md',
    '  node validate-plan-blueprint.cjs 47 planFile',
    '  node validate-plan-blueprint.cjs 47 blueprintExists',
  ];
  lines.forEach(l => process.stderr.write(`[ERROR] ${l}\n`));
};

const listAvailablePlans = (startPath: string): string[] => {
  const tmRoot = findStrikethrooRoot(startPath);
  if (!tmRoot) return [];
  const plans = getAllPlans(tmRoot);
  return plans
    .map(p => p.name)
    .sort((a, b) => {
      const aMatch = a.match(/^(\d+)--/);
      const bMatch = b.match(/^(\d+)--/);
      if (!aMatch || !bMatch || !aMatch[1] || !bMatch[1]) return 0;
      return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
    });
};

const main = (): void => {
  const inputId = process.argv[2];
  const fieldName = process.argv[3];

  if (!inputId) {
    usage();
    process.exit(1);
  }

  const numericInput = parseInt(inputId, 10);
  const isNumeric = !Number.isNaN(numericInput);
  const isAbsolutePath = inputId.startsWith('/');

  if (!isNumeric && !isAbsolutePath) {
    process.stderr.write(`[ERROR] Invalid plan ID: "${inputId}" is not a valid number\n`);
    process.exit(1);
  }

  const resolved = resolvePlan(inputId);
  if (!resolved) {
    process.stderr.write(`[ERROR] Plan ID ${inputId} not found or invalid\n`);
    process.stderr.write('[ERROR] \n');
    const available = listAvailablePlans(process.cwd());
    if (available.length > 0) {
      process.stderr.write('[ERROR] Available plans:\n');
      available.forEach(name => process.stderr.write(`[ERROR]   ${name}\n`));
    }
    process.exit(1);
  }

  const invalidComplexity = validateTaskComplexityScores(resolved.planDir);
  const result: ValidationResult = {
    planFile: resolved.planFile,
    planDir: resolved.planDir,
    strikethrooRoot: resolved.strikethrooRoot,
    planId: resolved.planId,
    taskCount: countTaskFiles(resolved.planDir),
    blueprintExists: hasExecutionBlueprint(resolved.planFile) ? 'yes' : 'no',
    complexityScoresValid: invalidComplexity.length === 0 ? 'yes' : 'no',
    invalidComplexityTasks: invalidComplexity.join('; '),
  };

  if (fieldName) {
    if (!VALID_FIELDS.includes(fieldName as keyof ValidationResult)) {
      process.stderr.write(`[ERROR] Invalid field name: ${fieldName}\n`);
      process.stderr.write(`[ERROR] Valid fields: ${VALID_FIELDS.join(', ')}\n`);
      process.exit(1);
    }
    const value = result[fieldName as keyof ValidationResult];
    process.stdout.write(`${String(value)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
  process.exit(0);
};

if (require.main === module) {
  main();
}

export { main };
