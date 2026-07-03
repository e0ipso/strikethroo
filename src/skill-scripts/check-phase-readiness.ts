import * as fs from 'fs';
import { parseBlueprintPhases } from './shared/blueprint-parse';
import { resolvePlan } from './shared/plan-resolve';
import { collectTaskReadinessIssues } from './shared/task-file';

const _printError = (message: string): void => {
  console.error(`ERROR: ${message}`);
};

const _printSuccess = (message: string): void => {
  console.log(`✓ ${message}`);
};

const _printInfo = (message: string): void => {
  console.log(message);
};

const main = (startPath: string = process.cwd()): void => {
  if (process.argv.length !== 4) {
    _printError('Invalid number of arguments');
    console.log('Usage: node check-phase-readiness.cjs <plan-id-or-path> <phase-number>');
    console.log('Example: node check-phase-readiness.cjs 16 1');
    process.exit(1);
  }

  const inputId = process.argv[2]!;
  const phaseNumber = parseInt(process.argv[3]!, 10);
  if (Number.isNaN(phaseNumber) || phaseNumber < 1) {
    _printError('Phase number must be a positive integer');
    process.exit(1);
  }

  const resolved = resolvePlan(inputId, startPath);
  if (!resolved) {
    _printError(`Plan "${inputId}" not found or invalid`);
    process.exit(1);
  }

  const { planDir, planFile, planId } = resolved;
  const planBody = fs.readFileSync(planFile, 'utf8');
  const phases = parseBlueprintPhases(planBody);
  if (!phases || phases.length === 0) {
    _printError('No Execution Blueprint section with phases found in plan');
    process.exit(1);
  }

  const phase = phases.find(p => p.index === phaseNumber);
  if (!phase) {
    _printError(`Phase ${phaseNumber} not found in plan ${planId}`);
    process.exit(1);
  }

  _printInfo(`Checking phase ${phaseNumber} readiness for plan ${planId}`);
  if (phase.name) _printInfo(`Phase name: ${phase.name}`);
  if (phase.taskIds.length === 0) {
    _printError(`Phase ${phaseNumber} has no tasks listed in the blueprint`);
    process.exit(1);
  }

  _printInfo(`Tasks in phase: ${phase.taskIds.join(', ')}`);
  console.log('');

  const allIssues = phase.taskIds.flatMap(taskId =>
    collectTaskReadinessIssues(planDir, taskId).map(issue => ({
      ...issue,
      phaseTaskId: String(taskId),
    }))
  );

  if (allIssues.length === 0) {
    _printSuccess(`Phase ${phaseNumber} is ready to execute`);
    process.exit(0);
  }

  _printError(`Phase ${phaseNumber} is not ready:`);
  for (const issue of allIssues) {
    console.log(`  - Task ${issue.phaseTaskId}: ${issue.detail}`);
  }
  process.exit(1);
};

if (require.main === module) {
  main();
}

export { main };
