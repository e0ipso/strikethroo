import * as fs from 'fs';
import * as path from 'path';
import { resolvePlan } from './shared/plan-resolve';
import {
  collectTaskReadinessIssues,
  extractDependencies,
  extractFrontmatter,
  extractStatus,
  findTaskFile,
} from './shared/task-file';

const _printError = (message: string) => {
  console.error(`ERROR: ${message}`);
};

const _printSuccess = (message: string) => {
  console.log(`✓ ${message}`);
};

const _printWarning = (message: string) => {
  console.log(`⚠ ${message}`);
};

const _printInfo = (message: string) => {
  console.log(message);
};

const _main = (startPath: string = process.cwd()) => {
  if (process.argv.length !== 4) {
    _printError('Invalid number of arguments');
    console.log('Usage: node check-task-dependencies.cjs <plan-id-or-path> <task-id>');
    console.log('Example: node check-task-dependencies.cjs 16 03');
    process.exit(1);
  }

  const inputId = process.argv[2];
  const taskId = process.argv[3];

  if (!inputId || !taskId) {
    _printError('Invalid arguments');
    process.exit(1);
  }

  const resolved = resolvePlan(inputId, startPath);

  if (!resolved) {
    _printError(`Plan "${inputId}" not found or invalid`);
    process.exit(1);
  }

  const { planDir, planId } = resolved;
  _printInfo(`Found plan directory: ${planDir}`);

  const taskFile = findTaskFile(planDir, taskId);

  if (!taskFile) {
    _printError(`Task with ID ${taskId} not found in plan ${planId}`);
    process.exit(1);
  }

  _printInfo(`Checking task: ${path.basename(taskFile)}`);
  console.log('');

  const issues = collectTaskReadinessIssues(planDir, taskId);
  const dependencyIssues = issues.filter(issue => issue.kind === 'unresolved-dependency');
  const blockingIssues = issues.filter(issue => issue.kind !== 'unresolved-dependency');

  if (blockingIssues.length > 0) {
    for (const issue of blockingIssues) {
      _printError(issue.detail);
    }
    process.exit(1);
  }

  const taskContent = fs.readFileSync(taskFile, 'utf8');
  const frontmatter = extractFrontmatter(taskContent);
  if (!frontmatter) {
    _printError('Could not extract frontmatter from task file');
    process.exit(1);
  }

  const dependencies = extractDependencies(frontmatter);

  if (dependencies.length === 0) {
    _printSuccess('Task has no dependencies - ready to execute!');
    process.exit(0);
  }

  _printInfo('Task dependencies found:');
  dependencies.forEach(dep => {
    console.log(`  - Task ${dep}`);
  });
  console.log('');

  _printInfo('Checking dependency status...');
  console.log('');

  let resolvedCount = 0;
  for (const depId of dependencies) {
    const depFile = findTaskFile(planDir, depId);
    const depFrontmatter = depFile ? extractFrontmatter(fs.readFileSync(depFile, 'utf8')) : null;
    const depStatus = depFrontmatter ? extractStatus(depFrontmatter) : null;

    if (depStatus === 'completed') {
      _printSuccess(`Task ${depId} - Status: completed ✓`);
      resolvedCount++;
    } else {
      _printWarning(`Task ${depId} - Status: ${depStatus ?? 'unknown'} ✗`);
    }
  }

  console.log('');
  _printInfo('=========================================');
  _printInfo('Dependency Check Summary');
  _printInfo('=========================================');
  _printInfo(`Total dependencies: ${dependencies.length}`);
  _printInfo(`Resolved: ${resolvedCount}`);
  _printInfo(`Unresolved: ${dependencies.length - resolvedCount}`);
  console.log('');

  if (dependencyIssues.length === 0) {
    _printSuccess(`All dependencies are resolved! Task ${taskId} is ready to execute.`);
    process.exit(0);
  }

  _printError(`Task ${taskId} has unresolved dependencies:`);
  dependencyIssues.forEach(issue => {
    console.log(issue.detail);
  });
  _printInfo('Please complete the dependencies before executing this task.');
  process.exit(1);
};

export { _main };

if (require.main === module) {
  _main();
}
