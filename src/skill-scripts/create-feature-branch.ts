import * as path from 'path';
import { execGit } from './shared/git-utils';
import { resolvePlan } from './shared/plan-resolve';

const _printError = (message: string): void => {
  console.error(`ERROR: ${message}`);
};

const _printSuccess = (message: string): void => {
  console.log(`✓ ${message}`);
};

const _printWarning = (message: string): void => {
  console.log(`⚠ ${message}`);
};

const _printInfo = (message: string): void => {
  console.log(message);
};

const _isGitRepo = (): boolean => {
  const result = execGit('git rev-parse --is-inside-work-tree');
  return result === 'true';
};

const _getCurrentBranch = (): string | null => {
  return execGit('git rev-parse --abbrev-ref HEAD');
};

const _hasUncommittedChanges = (): boolean => {
  const status = execGit('git status --porcelain');
  return status !== null && status.length > 0;
};

const _branchExists = (branchName: string): boolean => {
  const localBranches = execGit('git branch --list');
  if (
    localBranches &&
    localBranches.split('\n').some(b => b.trim().replace('* ', '') === branchName)
  ) {
    return true;
  }

  const remoteBranches = execGit('git branch -r --list');
  if (remoteBranches && remoteBranches.split('\n').some(b => b.trim().includes(branchName))) {
    return true;
  }

  return false;
};

const _sanitizeBranchName = (planName: string): string => {
  return planName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
};

const _extractPlanName = (planDir: string): string => {
  const dirName = path.basename(planDir);
  const match = dirName.match(/^\d+--(.+)$/);
  return match && match[1] ? match[1] : dirName;
};

const main = (startPath: string = process.cwd()): void => {
  if (process.argv.length < 3) {
    _printError('Missing plan ID argument');
    console.log('Usage: node create-feature-branch.cjs <plan-id-or-path>');
    console.log('Example: node create-feature-branch.cjs 58');
    process.exit(1);
  }

  const inputId = process.argv[2]!;

  if (!_isGitRepo()) {
    _printError('Not a git repository');
    process.exit(1);
  }

  const resolved = resolvePlan(inputId, startPath);

  if (!resolved) {
    _printError(`Plan "${inputId}" not found or invalid`);
    process.exit(1);
  }

  const { planDir, planId } = resolved;
  _printInfo(`Found plan: ${path.basename(planDir)}`);

  const currentBranch = _getCurrentBranch();

  if (!currentBranch) {
    _printError('Could not determine current git branch');
    process.exit(1);
  }

  if (currentBranch !== 'main' && currentBranch !== 'master') {
    _printWarning(`Not on main/master branch (current: ${currentBranch})`);
    _printInfo('Proceeding without creating a new branch');
    process.exit(0);
  }

  if (_hasUncommittedChanges()) {
    _printError('Uncommitted changes detected in working tree');
    _printInfo('Please commit or stash your changes before creating a feature branch');
    process.exit(1);
  }

  const planName = _extractPlanName(planDir);
  const sanitizedName = _sanitizeBranchName(planName);
  const branchName = `feature/${planId}--${sanitizedName}`;

  if (_branchExists(branchName)) {
    _printWarning(`Branch "${branchName}" already exists`);
    _printInfo('Proceeding with existing branch');
    process.exit(0);
  }

  const createResult = execGit(`git checkout -b "${branchName}"`);

  if (createResult === null) {
    _printError(`Failed to create branch "${branchName}"`);
    process.exit(1);
  }

  _printSuccess(`Created and switched to branch: ${branchName}`);
  process.exit(0);
};

if (require.main === module) {
  main();
}

export { main, _sanitizeBranchName, _extractPlanName };
