#!/usr/bin/env node
/**
 * Replaces the root skills/ mirror with the built templates/harness/skills/
 * tree and verifies byte-for-byte parity between the two.
 *
 * The root skills/ directory is the Git-tree release channel read from the
 * default branch. It records the most recent *released* skill set, so ordinary
 * builds must never touch it: release automation is the only normal writer of
 * skills/, and `npm run build` never calls this script.
 *
 *   node scripts/sync-skills-mirror.cjs            replace skills/, then verify
 *   node scripts/sync-skills-mirror.cjs --verify   verify only, never writes
 *
 * Exit codes: 0 on exact parity, 1 on a parity failure, 2 on a precondition
 * or usage failure. Discrepancies are printed to stderr, one per path.
 *
 * Both directories may be overridden for testing with the optional environment
 * variables STRIKETHROO_MIRROR_SOURCE and STRIKETHROO_MIRROR_TARGET, resolved
 * against the current working directory. They default to
 * <repo>/templates/harness/skills and <repo>/skills respectively.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE = process.env.STRIKETHROO_MIRROR_SOURCE
  ? path.resolve(process.env.STRIKETHROO_MIRROR_SOURCE)
  : path.join(REPO_ROOT, 'templates', 'harness', 'skills');

const TARGET = process.env.STRIKETHROO_MIRROR_TARGET
  ? path.resolve(process.env.STRIKETHROO_MIRROR_TARGET)
  : path.join(REPO_ROOT, 'skills');

const EXIT_PARITY_FAILURE = 1;
const EXIT_PRECONDITION_FAILURE = 2;

/** Repo-relative path when the target is inside the repo, absolute otherwise. */
function displayPath(target) {
  const rel = path.relative(REPO_ROOT, target);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : target;
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/** Recursively lists files under `dir` as sorted, relative POSIX paths. */
function listFiles(dir) {
  const files = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else files.push(rel);
    }
  };
  if (fs.existsSync(dir)) walk(dir, '');
  return files.sort();
}

// ---------------------------------------------------------------------------
// Preconditions
// ---------------------------------------------------------------------------

/**
 * Refuses to operate on an unbuilt source tree. The mirror must never record a
 * partial build, so the source must hold at least one skill directory carrying
 * a SKILL.md.
 */
function assertSourceIsBuilt() {
  if (!fs.existsSync(SOURCE) || !fs.statSync(SOURCE).isDirectory()) {
    console.error(
      `Source skill tree not found: ${SOURCE}\n` +
        'Run npm run build first.'
    );
    process.exit(EXIT_PRECONDITION_FAILURE);
  }

  const skills = fs
    .readdirSync(SOURCE, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(SOURCE, entry.name, 'SKILL.md'))
    );

  if (skills.length === 0) {
    console.error(
      `Source skill tree contains no built skill directories: ${SOURCE}\n` +
        'Every skill directory must contain a SKILL.md. Run npm run build first.'
    );
    process.exit(EXIT_PRECONDITION_FAILURE);
  }
}

// ---------------------------------------------------------------------------
// Parity
// ---------------------------------------------------------------------------

/**
 * Compares both trees by inventory and bytes, printing every discrepancy.
 *
 * @returns {number} Total number of discrepancies; 0 means exact parity.
 */
function verify() {
  const sourceFiles = listFiles(SOURCE);
  const targetFiles = new Set(listFiles(TARGET));

  const missing = [];
  const different = [];

  for (const rel of sourceFiles) {
    if (!targetFiles.has(rel)) {
      missing.push(rel);
      continue;
    }
    targetFiles.delete(rel);
    const sourceBytes = fs.readFileSync(path.join(SOURCE, ...rel.split('/')));
    const targetBytes = fs.readFileSync(path.join(TARGET, ...rel.split('/')));
    if (!sourceBytes.equals(targetBytes)) different.push(rel);
  }

  const extra = [...targetFiles].sort();

  for (const rel of missing) console.error(`  missing   ${rel}`);
  for (const rel of extra) console.error(`  extra     ${rel}`);
  for (const rel of different) console.error(`  different ${rel}`);

  const total = missing.length + extra.length + different.length;
  if (total === 0) {
    process.stdout.write(
      `Mirror in sync: ${sourceFiles.length} file${sourceFiles.length !== 1 ? 's' : ''} ` +
        `match ${displayPath(SOURCE)}.\n`
    );
  } else {
    console.error(
      `\nMirror parity failed: ${missing.length} missing, ${extra.length} extra, ` +
        `${different.length} different.\n` +
        `  source ${SOURCE}\n` +
        `  target ${TARGET}`
    );
  }
  return total;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Whole-tree replacement. The target is removed before the copy so no stale
 * file can survive; this is a replacement, not an overlay.
 */
function sync() {
  fs.rmSync(TARGET, { recursive: true, force: true });
  fs.cpSync(SOURCE, TARGET, { recursive: true });
  const copied = listFiles(TARGET);
  process.stdout.write(
    `Replaced ${TARGET} with ${copied.length} file${copied.length !== 1 ? 's' : ''} from ${SOURCE}.\n`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.length === 1 && args[0] === '--verify';

  if (args.length > 0 && !verifyOnly) {
    console.error(
      `Unknown arguments: ${args.join(' ')}\n` +
        'Usage: node scripts/sync-skills-mirror.cjs [--verify]'
    );
    process.exit(EXIT_PRECONDITION_FAILURE);
  }

  assertSourceIsBuilt();

  if (verifyOnly) {
    if (!fs.existsSync(TARGET)) {
      console.error(
        `Mirror directory not found: ${TARGET}\n` +
          'Run node scripts/sync-skills-mirror.cjs to populate it.'
      );
      process.exit(EXIT_PARITY_FAILURE);
    }
    process.exit(verify() === 0 ? 0 : EXIT_PARITY_FAILURE);
  }

  sync();
  process.exit(verify() === 0 ? 0 : EXIT_PARITY_FAILURE);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(EXIT_PRECONDITION_FAILURE);
}
