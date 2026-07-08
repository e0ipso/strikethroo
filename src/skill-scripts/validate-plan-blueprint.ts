import * as fs from 'fs';
import * as path from 'path';
import { findStrikethrooRoot } from './shared/root';
import { getAllPlans } from './shared/plan-scan';
import { resolvePlan } from './shared/plan-resolve';
import { extractFrontmatter } from './shared/task-file';
import { hasExecutionBlueprint } from './shared/blueprint-detection';
import { countTaskFiles } from './shared/task-count';

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

/**
 * Validates that every task file carries an integer `complexity_score` from 1
 * to 10 inclusive, mirroring the serve-model parser contract in
 * `src/serve/markdown.ts`. Returns a human-readable reason per offending task
 * file (missing, non-integer, or out-of-range); an empty array means all task
 * files satisfy the contract.
 */
const validateComplexityScores = (planDir: string): string[] => {
  const tasksDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return [];
  let files: string[];
  try {
    if (!fs.lstatSync(tasksDir).isDirectory()) return [];
    files = fs
      .readdirSync(tasksDir)
      .filter(f => f.endsWith('.md'))
      .sort();
  } catch (_err) {
    return [];
  }

  const invalid: string[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    } catch (_err) {
      invalid.push(`${file}: unreadable`);
      continue;
    }
    const frontmatter = extractFrontmatter(content);
    const match = frontmatter
      ? frontmatter.match(/^\s*complexity_score\s*:\s*(.*?)\s*(?:#.*)?$/im)
      : null;
    if (!match || match[1] === undefined) {
      invalid.push(`${file}: missing complexity_score`);
      continue;
    }
    const raw = match[1].trim();
    if (!/^\d+$/.test(raw)) {
      invalid.push(`${file}: non-integer complexity_score "${raw}"`);
      continue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (parsed < 1 || parsed > 10) {
      invalid.push(`${file}: complexity_score ${parsed} out of range 1-10`);
    }
  }
  return invalid;
};

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

  const invalidComplexity = validateComplexityScores(resolved.planDir);
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
