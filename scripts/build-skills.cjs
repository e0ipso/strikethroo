#!/usr/bin/env node
/**
 * Bundles each TypeScript entrypoint under src/skill-scripts/ into a
 * self-contained .cjs file inside the corresponding skill directory.
 *
 * To add a future skill: add a TypeScript entrypoint under
 * src/skill-scripts/, register it in SKILL_ENTRYPOINTS below, and
 * `npm run build` will produce the bundled .cjs alongside the skill.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'skills');

const SKILL_ENTRYPOINTS = [
  {
    src: 'src/skill-scripts/find-task-manager-root.ts',
    skill: 'task-create-plan',
    out: 'find-task-manager-root.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-plan-id.ts',
    skill: 'task-create-plan',
    out: 'get-next-plan-id.cjs',
  },
  {
    src: 'src/skill-scripts/find-task-manager-root.ts',
    skill: 'task-generate-tasks',
    out: 'find-task-manager-root.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'task-generate-tasks',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-task-id.ts',
    skill: 'task-generate-tasks',
    out: 'get-next-task-id.cjs',
  },
];

const nodeTarget = `node${process.versions.node.split('.')[0]}`;

const buildAll = async () => {
  for (const entry of SKILL_ENTRYPOINTS) {
    const outDir = path.join(SKILLS_ROOT, entry.skill, 'scripts');
    fs.mkdirSync(outDir, { recursive: true });
    await esbuild.build({
      entryPoints: [path.join(REPO_ROOT, entry.src)],
      outfile: path.join(outDir, entry.out),
      platform: 'node',
      format: 'cjs',
      bundle: true,
      target: nodeTarget,
      logLevel: 'warning',
    });
    process.stdout.write(`  bundled ${entry.skill}/${entry.out}\n`);
  }
};

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
