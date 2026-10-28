// Git exports these to hooks (from a linked worktree, GIT_DIR and
// GIT_INDEX_FILE point at the real checkout). When the pre-commit hook runs
// the suite, every fixture `git init`, `git config` and `git commit` that
// inherits them writes into the checkout being committed instead of its own
// temporary directory. The list is `git rev-parse --local-env-vars`.
const GIT_LOCAL_ENV_VARS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
];

for (const name of GIT_LOCAL_ENV_VARS) {
  delete process.env[name];
}
