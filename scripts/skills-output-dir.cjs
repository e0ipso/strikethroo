/**
 * Output-directory selection shared by build-skills.cjs and
 * build-skill-prompts.cjs.
 *
 * Both builders write the same skill tree. Local builds and the test suite
 * use dist-test/, which is gitignored. The release rebuilds into the tracked
 * root skills/ directory with `--out skills --clean`, so `npm run build`
 * never touches what `npx skills add` installs.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'dist-test');

/**
 * @param {string[]} argv          - Arguments after the script name
 * @param {{ allowClean?: boolean }} [options]
 * @returns {{ outputDir: string, clean: boolean }}
 */
function parseOutputArgs(argv, options = {}) {
  let outputDir = DEFAULT_OUTPUT_DIR;
  let clean = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      outputDir = path.resolve(REPO_ROOT, value);
    } else if (arg.startsWith('--out=')) {
      outputDir = path.resolve(REPO_ROOT, arg.slice('--out='.length));
    } else if (arg === '--clean' && options.allowClean) {
      clean = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const relative = path.relative(REPO_ROOT, outputDir);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`--out must name a directory inside the repository, got ${outputDir}`);
  }

  return { outputDir, clean };
}

/** Removes the output tree so nothing from a previous build survives. */
function cleanOutputDir(outputDir) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

module.exports = { REPO_ROOT, DEFAULT_OUTPUT_DIR, parseOutputArgs, cleanOutputDir };
