#!/usr/bin/env node
/**
 * Bundles each TypeScript entrypoint under src/skill-scripts/ into a
 * self-contained .cjs file inside the corresponding skill directory.
 *
 * To add a future skill: add a TypeScript entrypoint under
 * src/skill-scripts/, register it in SKILL_SCRIPTS below, and
 * `npm run build` will produce the bundled .cjs under
 * dist-test/<skill>/scripts/.
 *
 *   node scripts/build-skills.cjs                    write dist-test/
 *   node scripts/build-skills.cjs --out skills --clean
 *                                                    release: wipe and rebuild skills/
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const { REPO_ROOT, parseOutputArgs, cleanOutputDir } = require('./skills-output-dir.cjs');

const { outputDir: SKILLS_ROOT, clean } = parseOutputArgs(process.argv.slice(2), {
  allowClean: true,
});

// Read the schema-version constant from the freshly compiled metadata module.
// `npm run build` runs `tsc` before this script, so `dist/metadata.js` exists.
const { CURRENT_WORKSPACE_SCHEMA_VERSION } = require(path.join(REPO_ROOT, 'dist', 'metadata.js'));
const { version: PACKAGE_VERSION } = require(path.join(REPO_ROOT, 'package.json'));

// Each skill lists its script names; paths and output names follow one convention.
const SKILL_SCRIPTS = {
  'st-code-review': ['find-strikethroo-root', 'validate-plan-blueprint', 'code-review'],
  'st-create-plan': ['find-strikethroo-root', 'check-for-updates', 'get-next-plan-id'],
  'st-generate-tasks': [
    'find-strikethroo-root',
    'check-for-updates',
    'validate-plan-blueprint',
    'get-next-task-id',
    'route-task-execution',
  ],
  'st-execute-blueprint': [
    'find-strikethroo-root',
    'check-for-updates',
    'validate-plan-blueprint',
    'create-feature-branch',
    'capture-base-commit',
    'check-phase-readiness',
    'dispatch-task-execution',
  ],
  'st-refine-plan': ['find-strikethroo-root', 'check-for-updates', 'validate-plan-blueprint'],
  'st-execute-task': [
    'find-strikethroo-root',
    'check-for-updates',
    'validate-plan-blueprint',
    'check-task-dependencies',
    'dispatch-task-execution',
  ],
  'st-full-workflow': [
    'find-strikethroo-root',
    'check-for-updates',
    'get-next-plan-id',
    'validate-plan-blueprint',
    'get-next-task-id',
    'route-task-execution',
    'create-feature-branch',
    'capture-base-commit',
    'check-phase-readiness',
    'dispatch-task-execution',
  ],
};

const SKILL_ENTRYPOINTS = Object.entries(SKILL_SCRIPTS).flatMap(([skill, scripts]) =>
  scripts.map(name => ({ skill, src: `src/skill-scripts/${name}.ts`, out: `${name}.cjs` }))
);

// Attribution belongs only on the review mechanism.
const REVIEW_BANNER = {
  js:
    '// Review-category modelling and false-positive suppression heuristics in\n' +
    '// this skill draw on PR-Agent (https://github.com/The-PR-Agent/pr-agent),\n' +
    '// used under its permissive licence. No PR-Agent code is vendored.',
};

const nodeTarget = `node${process.versions.node.split('.')[0]}`;

const buildAll = async () => {
  if (clean) cleanOutputDir(SKILLS_ROOT);
  const builtFiles = [];
  for (const entry of SKILL_ENTRYPOINTS) {
    const outDir = path.join(SKILLS_ROOT, entry.skill, 'scripts');
    fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, entry.out);
    await esbuild.build({
      entryPoints: [path.join(REPO_ROOT, entry.src)],
      outfile,
      platform: 'node',
      format: 'cjs',
      bundle: true,
      target: nodeTarget,
      logLevel: 'warning',
      ...(entry.out === 'code-review.cjs' ? { banner: REVIEW_BANNER } : {}),
      define: {
        EXPECTED_WORKSPACE_SCHEMA_VERSION: JSON.stringify(CURRENT_WORKSPACE_SCHEMA_VERSION),
        SKILL_RELEASE_VERSION: JSON.stringify(PACKAGE_VERSION),
      },
    });
    builtFiles.push(outfile);
    process.stdout.write(`  bundled ${entry.skill}/${entry.out}\n`);
  }

  // Smoke check: ambient identifiers must have been substituted out of every
  // bundle. If they survive, esbuild's `define` silently failed (likely
  // because the source no longer references them under that exact name).
  for (const file of builtFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    if (contents.includes('EXPECTED_WORKSPACE_SCHEMA_VERSION')) {
      console.error(
        `Build smoke check failed: ${file} still contains the literal ` +
          'EXPECTED_WORKSPACE_SCHEMA_VERSION (esbuild define did not substitute).'
      );
      process.exit(1);
    }
    if (path.basename(file) === 'check-for-updates.cjs') {
      if (contents.includes('SKILL_RELEASE_VERSION')) {
        console.error(
          `Build smoke check failed: ${file} still contains the literal ` +
            'SKILL_RELEASE_VERSION (esbuild define did not substitute).'
        );
        process.exit(1);
      }
      if (!contents.includes(PACKAGE_VERSION)) {
        console.error(
          `Build smoke check failed: ${file} does not contain stamped package version ${PACKAGE_VERSION}.`
        );
        process.exit(1);
      }
    }
  }
};

buildAll().catch(err => {
  console.error(err);
  process.exit(1);
});
