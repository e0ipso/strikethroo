import * as fs from 'fs';
import * as path from 'path';
import { resolvePlan } from './shared/plan-resolve';

// Color functions for output
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

// Function to extract frontmatter block from file content
const _extractFrontmatter = (content: string): string | null => {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  return match && match[1] ? match[1] : null;
};

// Function to find task file with padded/unpadded ID handling
const _findTaskFile = (planDir: string, taskId: string): string | null => {
  const taskDir = path.join(planDir, 'tasks');

  if (!fs.existsSync(taskDir)) {
    return null;
  }

  const variations = [taskId, taskId.padStart(2, '0'), taskId.replace(/^0+/, '') || '0'];

  const uniqueVariations = [...new Set(variations)];

  try {
    const files = fs.readdirSync(taskDir);
    const found = uniqueVariations.reduce<string | null>((acc, v) => {
      if (acc) return acc;
      const match = files.find(f => f.startsWith(`${v}--`) && f.endsWith('.md'));
      return match ? path.join(taskDir, match) : null;
    }, null);
    return found;
  } catch (_err) {
    return null;
  }
};

// Function to extract dependencies from frontmatter
const _extractDependencies = (frontmatter: string): string[] => {
  const lines = frontmatter.split('\n');
  const dependencies: string[] = [];
  let inDependenciesSection = false;

  for (const line of lines) {
    // Check for dependencies line
    if (line.match(/^dependencies:/)) {
      inDependenciesSection = true;

      // Check if dependencies are on the same line (array syntax)
      const arrayMatch = line.match(/\[(.*)\]/);
      if (arrayMatch && arrayMatch[1]) {
        const deps = arrayMatch[1]
          .split(',')
          .map(dep => dep.trim().replace(/['"]/g, ''))
          .filter(dep => dep.length > 0);
        dependencies.push(...deps);
        inDependenciesSection = false;
      }
      continue;
    }

    // If we're in dependencies section and hit a non-indented line that's not a list item, exit
    if (inDependenciesSection && line.match(/^[^ ]/) && !line.match(/^[ \t]*-/)) {
      inDependenciesSection = false;
    }

    // Parse list format dependencies
    if (inDependenciesSection && line.match(/^[ \t]*-/)) {
      const dep = line
        .replace(/^[ \t]*-[ \t]*/, '')
        .replace(/[ \t]*$/, '')
        .replace(/['"]/g, '');
      if (dep.length > 0) {
        dependencies.push(dep);
      }
    }
  }

  return dependencies;
};

// Function to extract status from frontmatter
const _extractStatus = (frontmatter: string): string | null => {
  const lines = frontmatter.split('\n');

  for (const line of lines) {
    if (line.match(/^status:/)) {
      return line
        .replace(/^status:[ \t]*/, '')
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .trim();
    }
  }

  return null;
};

// Main function
const _main = (startPath: string = process.cwd()) => {
  // Check arguments
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

  // Find task file
  const taskFile = _findTaskFile(planDir, taskId);

  if (!taskFile || !fs.existsSync(taskFile)) {
    _printError(`Task with ID ${taskId} not found in plan ${planId}`);
    process.exit(1);
  }

  _printInfo(`Checking task: ${path.basename(taskFile)}`);
  console.log('');

  // Read and parse task file
  const taskContent = fs.readFileSync(taskFile, 'utf8');
  const frontmatter = _extractFrontmatter(taskContent);
  if (!frontmatter) {
    _printError('Could not extract frontmatter from task file');
    process.exit(1);
  }
  const dependencies = _extractDependencies(frontmatter);

  // Check if there are any dependencies
  if (dependencies.length === 0) {
    _printSuccess('Task has no dependencies - ready to execute!');
    process.exit(0);
  }

  // Display dependencies
  _printInfo('Task dependencies found:');
  dependencies.forEach(dep => {
    console.log(`  - Task ${dep}`);
  });
  console.log('');

  // Check each dependency
  let allResolved = true;
  const unresolvedDeps: string[] = [];
  let resolvedCount = 0;
  const totalDeps = dependencies.length;

  _printInfo('Checking dependency status...');
  console.log('');

  for (const depId of dependencies) {
    // Find dependency task file
    const depFile = _findTaskFile(planDir, depId);

    if (!depFile || !fs.existsSync(depFile)) {
      _printError(`Dependency task ${depId} not found`);
      allResolved = false;
      unresolvedDeps.push(`${depId} (not found)`);
      continue;
    }

    // Extract status from dependency task
    const depContent = fs.readFileSync(depFile, 'utf8');
    const depFrontmatter = _extractFrontmatter(depContent);
    if (!depFrontmatter) {
      _printError(`Could not extract frontmatter from dependency task ${depId}`);
      allResolved = false;
      unresolvedDeps.push(`${depId} (no frontmatter)`);
      continue;
    }
    const status = _extractStatus(depFrontmatter);

    // Check if status is completed
    if (status === 'completed') {
      _printSuccess(`Task ${depId} - Status: completed ✓`);
      resolvedCount++;
    } else {
      _printWarning(`Task ${depId} - Status: ${status || 'unknown'} ✗`);
      allResolved = false;
      unresolvedDeps.push(`${depId} (${status || 'unknown'})`);
    }
  }

  console.log('');
  _printInfo('=========================================');
  _printInfo('Dependency Check Summary');
  _printInfo('=========================================');
  _printInfo(`Total dependencies: ${totalDeps}`);
  _printInfo(`Resolved: ${resolvedCount}`);
  _printInfo(`Unresolved: ${totalDeps - resolvedCount}`);
  console.log('');

  if (allResolved) {
    _printSuccess(`All dependencies are resolved! Task ${taskId} is ready to execute.`);
    process.exit(0);
  } else {
    _printError(`Task ${taskId} has unresolved dependencies:`);
    unresolvedDeps.forEach(dep => {
      console.log(dep);
    });
    _printInfo('Please complete the dependencies before executing this task.');
    process.exit(1);
  }
};

export { _main };

if (require.main === module) {
  _main();
}
