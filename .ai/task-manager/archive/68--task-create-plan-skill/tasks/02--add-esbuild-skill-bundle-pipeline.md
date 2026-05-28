---
id: 2
group: "build-pipeline"
dependencies: [1]
status: "completed"
created: "2026-05-14"
skills:
  - typescript
  - esbuild
---
# Add esbuild skill-bundle pipeline to npm run build

## Objective
Add an `esbuild`-driven build step that bundles each TypeScript entrypoint in `src/skill-scripts/` into a self-contained `.cjs` file inside `templates/skills/task-create-plan/scripts/`, wire it into `npm run build`, declare `esbuild` as a dev dependency, and git-ignore the generated outputs. The pipeline must be reusable for future skills via a documented convention.

## Skills Required
- `typescript`: implement the build script in TypeScript (or a small `.cjs`/`.mjs` if it cannot participate in the main `tsc` emit cleanly).
- `esbuild`: configure `esbuild`'s Node API for multi-entry CommonJS bundling targeting Node, with bundling enabled and no implicit repo-layout dependencies.

## Acceptance Criteria
- [ ] `esbuild` is added as a `devDependency` in `package.json`.
- [ ] A small build script (e.g. `scripts/build-skills.cjs` or `src/build-skills.ts` compiled by `tsc` first) enumerates entrypoints from `src/skill-scripts/` and emits one bundled `.cjs` per entrypoint into `templates/skills/task-create-plan/scripts/`.
- [ ] Each generated `.cjs` is configured with `platform: 'node'`, `format: 'cjs'`, `bundle: true`, and no entries in `external` that would leak repo paths; outputs are self-contained.
- [ ] The mapping from entrypoint → target skill directory is encoded explicitly in the build script (a simple object or filename/folder convention is acceptable). The convention is implementable today and extensible for future skills without re-architecting the pipeline.
- [ ] `npm run build` runs both the existing TypeScript compile AND the skill bundle step (e.g. `"build": "tsc && node scripts/build-skills.cjs"` or equivalent). A single `npm run build` invocation produces both `dist/` and the skill bundles.
- [ ] `.gitignore` excludes generated outputs under `templates/skills/*/scripts/` (or the specific path `templates/skills/task-create-plan/scripts/`). Verify with `git status` that fresh build outputs are reported as ignored.
- [ ] The existing `files: ["templates/"]` entry in `package.json` already includes the new skill directory; no changes to publish rules are required, but confirm by inspecting the resulting `npm pack` tarball.
- [ ] No file under `templates/ai-task-manager/config/scripts/` and no file under `templates/assistant/commands/` is modified.

## Technical Requirements
- `esbuild` Node API: invoke `await build({ entryPoints, outfile/outdir, platform: 'node', format: 'cjs', bundle: true, target: 'node22' (or matching the project's `engines.node`) })` per entrypoint, or use a single `build()` call with `outdir` + named entrypoints.
- The build script must work from a clean checkout with only `npm install` having been run (no requirement that `dist/` already exists, beyond what `tsc` produces in the same `npm run build`).
- Bundled output must execute under Node ≥ 22.14.0 (matching `package.json` `engines.node`).
- Generated `.cjs` filenames should be the kebab-case name of the entrypoint, matching the names the SKILL.md references (task 3 will reference these filenames).

## Input Dependencies
- Task 1: TypeScript entrypoints and shared helpers under `src/skill-scripts/` must exist and be importable so the bundler has something to bundle.

## Output Artifacts
- `package.json` updated with: `esbuild` in `devDependencies`, and a modified `"build"` script that runs both `tsc` and the skill bundler.
- A new build script file (location chosen by the implementer, e.g. `scripts/build-skills.cjs`).
- Updated `.gitignore` excluding the generated skill bundles.
- An empty (or populated, after first build) `templates/skills/task-create-plan/scripts/` directory containing the generated `.cjs` files when `npm run build` is executed.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Add esbuild**: run `npm install --save-dev esbuild` (or update `package.json` directly with the latest stable version and run `npm install`). Do not pin to an ancient version; choose the current stable line at implementation time.
2. **Pick the build-script location**. Two reasonable choices:
   - `scripts/build-skills.cjs` at the repo root — pure CommonJS, no compile step needed, can `require('esbuild')` directly. Simpler.
   - `src/build-skills.ts` compiled by `tsc` then invoked via `node dist/build-skills.js`. Type-safe but introduces a sequencing constraint inside `npm run build`.
   Prefer the first option for simplicity unless the codebase already establishes a TypeScript build-tooling convention.
3. **Define the entrypoint mapping** in the build script. Minimum viable form:
   ```js
   const SKILL_ENTRYPOINTS = [
     { src: 'src/skill-scripts/find-task-manager-root.ts', skill: 'task-create-plan', out: 'find-task-manager-root.cjs' },
     { src: 'src/skill-scripts/get-next-plan-id.ts', skill: 'task-create-plan', out: 'get-next-plan-id.cjs' },
   ];
   ```
   The exact entrypoint list must match what task 1 produced; if task 1 added more entrypoints (e.g. a plan-blueprint validator), include them.
4. **Invoke esbuild** for each entry:
   ```js
   const path = require('path');
   const fs = require('fs');
   const esbuild = require('esbuild');
   const REPO_ROOT = __dirname.endsWith('scripts') ? path.resolve(__dirname, '..') : process.cwd();
   const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates', 'skills');

   async function buildAll() {
     for (const entry of SKILL_ENTRYPOINTS) {
       const outDir = path.join(TEMPLATES_DIR, entry.skill, 'scripts');
       fs.mkdirSync(outDir, { recursive: true });
       await esbuild.build({
         entryPoints: [path.join(REPO_ROOT, entry.src)],
         outfile: path.join(outDir, entry.out),
         platform: 'node',
         format: 'cjs',
         bundle: true,
         target: `node${process.versions.node.split('.')[0]}`,
         logLevel: 'info',
       });
     }
   }
   buildAll().catch((err) => { console.error(err); process.exit(1); });
   ```
5. **Update `package.json`** `"build"` script. Two viable forms:
   - `"build": "tsc && node scripts/build-skills.cjs"`
   - Add a separate `"build:skills": "node scripts/build-skills.cjs"` and chain it: `"build": "tsc && npm run build:skills"`. The chained form is friendlier for local iteration; prefer it.
6. **Update `.gitignore`**. Append:
   ```
   # Generated skill script bundles
   templates/skills/*/scripts/
   ```
   (or scope to `templates/skills/task-create-plan/scripts/` if a wider pattern would conflict with future hand-written assets).
7. **Verify the publish rule**. `package.json` already has `"files": ["dist/", "templates/", "LICENSE"]`. The `templates/` glob covers the skill directory. No edit required, but during validation in task 4, the smoke check should run `npm pack --dry-run` and confirm the skill scripts appear in the listed files.
8. **Run end-to-end**: `npm run build` from a clean tree must succeed and produce both `dist/` and `templates/skills/task-create-plan/scripts/*.cjs`. Confirm `git status` lists the generated files as ignored (no longer reported as untracked).
9. **Run existing lint/tests**: `npm run lint` and `npm test` must continue to pass.

</details>
