#!/usr/bin/env node
/**
 * Bundles each TypeScript entrypoint under src/skill-scripts/ into a
 * self-contained .cjs file inside the corresponding skill directory.
 *
 * To add a future skill: add a TypeScript entrypoint under
 * src/skill-scripts/, register it in SKILL_ENTRYPOINTS below, and
 * `npm run build` will produce the bundled .cjs under
 * templates/harness/skills/<skill>/scripts/.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');

// Read the schema-version constant from the freshly compiled metadata module.
// `npm run build` runs `tsc` before this script, so `dist/metadata.js` exists.
const { CURRENT_WORKSPACE_SCHEMA_VERSION } = require(
  path.join(REPO_ROOT, 'dist', 'metadata.js')
);

const SKILL_ENTRYPOINTS = [
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-create-plan',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-plan-id.ts',
    skill: 'st-create-plan',
    out: 'get-next-plan-id.cjs',
  },
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-generate-tasks',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'st-generate-tasks',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-task-id.ts',
    skill: 'st-generate-tasks',
    out: 'get-next-task-id.cjs',
  },
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-execute-blueprint',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'st-execute-blueprint',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/create-feature-branch.ts',
    skill: 'st-execute-blueprint',
    out: 'create-feature-branch.cjs',
  },
  {
    src: 'src/skill-scripts/check-phase-readiness.ts',
    skill: 'st-execute-blueprint',
    out: 'check-phase-readiness.cjs',
  },
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-refine-plan',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'st-refine-plan',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-execute-task',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'st-execute-task',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/check-task-dependencies.ts',
    skill: 'st-execute-task',
    out: 'check-task-dependencies.cjs',
  },
  {
    src: 'src/skill-scripts/find-strikethroo-root.ts',
    skill: 'st-full-workflow',
    out: 'find-strikethroo-root.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-plan-id.ts',
    skill: 'st-full-workflow',
    out: 'get-next-plan-id.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'st-full-workflow',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-task-id.ts',
    skill: 'st-full-workflow',
    out: 'get-next-task-id.cjs',
  },
  {
    src: 'src/skill-scripts/create-feature-branch.ts',
    skill: 'st-full-workflow',
    out: 'create-feature-branch.cjs',
  },
  {
    src: 'src/skill-scripts/check-phase-readiness.ts',
    skill: 'st-full-workflow',
    out: 'check-phase-readiness.cjs',
  },
];

const nodeTarget = `node${process.versions.node.split('.')[0]}`;

const buildAll = async () => {
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
      define: {
        EXPECTED_WORKSPACE_SCHEMA_VERSION: JSON.stringify(
          CURRENT_WORKSPACE_SCHEMA_VERSION
        ),
      },
    });
    builtFiles.push(outfile);
    process.stdout.write(`  bundled ${entry.skill}/${entry.out}\n`);
  }

  // Smoke check: the ambient identifier must have been substituted out of
  // every bundle. If it survives, esbuild's `define` silently failed (likely
  // because the source no longer references it under that exact name).
  for (const file of builtFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    if (contents.includes('EXPECTED_WORKSPACE_SCHEMA_VERSION')) {
      console.error(
        `Build smoke check failed: ${file} still contains the literal ` +
          'EXPECTED_WORKSPACE_SCHEMA_VERSION (esbuild define did not substitute).'
      );
      process.exit(1);
    }
  }
};

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
