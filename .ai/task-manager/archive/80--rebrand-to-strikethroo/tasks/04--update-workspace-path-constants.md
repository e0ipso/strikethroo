---
id: 4
group: "constants"
dependencies: [2]
status: "completed"
created: 2026-05-28
skills:
  - typescript
---
# Update workspace path constants and resolver error messages

## Objective
Switch every workspace-path constant in TypeScript source from `.ai/task-manager/` to `.ai/strikethroo/`, point the CLI's file-copy step at `templates/strikethroo/`, and update the self-healing error message strings in the workspace-root resolver to reference the new install commands.

## Skills Required
- typescript — surgical edits to a handful of `.ts` source files with hardcoded path constants and template string literals.

## Acceptance Criteria
- [ ] `src/skill-scripts/shared/root.ts` resolves the workspace by looking for `.ai/strikethroo/.init-metadata.json` (no fallback to `.ai/task-manager/`).
- [ ] The two schema-version error message branches in `root.ts` reference `npx strikethroo init` (workspace-older-than-skill branch) and `npx skills add e0ipso/strikethroo` (skill-older-than-workspace branch).
- [ ] The CLI-side workspace constant in `src/metadata.ts` (or wherever the `init` writer composes the workspace path) writes to `.ai/strikethroo/` and emits its metadata at `.ai/strikethroo/.init-metadata.json`.
- [ ] The CLI's file-copy logic that seeds a workspace points at `templates/strikethroo/` as the source (not `templates/ai-task-manager/`).
- [ ] No production TypeScript file under `src/` contains the substring `ai-task-manager` or `task-manager` in code, comments, or string literals — verified by `grep -rE 'ai-task-manager|task-manager' src/ --include='*.ts'` returning no hits (test fixtures under `src/__tests__/` are updated in task 08 and are out of scope here).
- [ ] `npm run` invocation of the skill-scripts type-check (`tsc --noEmit -p tsconfig.skill-scripts.json`) exits zero.
- [ ] `npm run build` continues to exit zero.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Keep the `workspaceSchemaVersion` integer name and value unchanged. The plan calls out explicitly that the field name does not contain the product name and is not part of this rebrand.
- Do not introduce a fallback resolver that also checks the old path. The plan's "no BC layers" directive forbids it.
- The expected `EXPECTED_WORKSPACE_SCHEMA_VERSION` esbuild `define` mechanism is unchanged; do not touch that wiring.

## Input Dependencies
- Task 02 must have renamed `templates/ai-task-manager/` to `templates/strikethroo/` so the CLI source's file-copy path resolves.

## Output Artifacts
- Updated `src/skill-scripts/shared/root.ts`.
- Updated CLI workspace constant location (`src/metadata.ts` or whichever module composes the workspace path during `init`).
- Updated CLI file-copy source path.
- Any other TypeScript source files containing the old workspace path string, brought into line.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. **Identify the affected files.** Start with a grep pass:
   ```bash
   grep -rEn 'ai-task-manager|task-manager|\.ai/task-manager' src/ --include='*.ts' | grep -v '__tests__'
   ```
   Every hit outside `src/__tests__/` is in scope for this task. Triage and update each.

2. **`src/skill-scripts/shared/root.ts` — the resolver.** Look for the path segment used during the parent-walk lookup, currently something like:
   ```ts
   const METADATA_PATH = '.ai/task-manager/.init-metadata.json';
   ```
   Change to:
   ```ts
   const METADATA_PATH = '.ai/strikethroo/.init-metadata.json';
   ```
   (The exact constant name may differ; update whatever holds the path string.)

3. **`src/skill-scripts/shared/root.ts` — the error messages.** The two branches roughly look like:
   - Workspace older than skill:
     `"Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update."`
   - Skill older than workspace:
     `"This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills."`

   Update to:
   - `"Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx strikethroo init\` with the latest CLI to update."`
   - `"This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/strikethroo\` to update skills."`

   Both strings are updated in the same edit; the test fixtures in task 08 will assert on these new strings.

4. **`src/metadata.ts` (or the module declaring `CURRENT_WORKSPACE_SCHEMA_VERSION`).** Look for a workspace-name constant — typically named `WORKSPACE_DIR_NAME` or similar — currently set to `"task-manager"` (so the composed path is `.ai/task-manager/`). Update the constant value to `"strikethroo"`.

5. **CLI file-copy source.** The `init` command copies from `templates/ai-task-manager/` into the destination's `.ai/<workspace>/`. Find this path:
   ```bash
   grep -rEn 'templates/ai-task-manager|templates/[\'\"]ai-task-manager' src/ --include='*.ts'
   ```
   Replace every hit with `templates/strikethroo`.

6. **Inline comments.** If TypeScript files contain `// AI Task Manager` or `// task-manager` references, update them to `// Strikethroo` / `// strikethroo` as appropriate. Keep the comment intent; only the brand label changes.

7. **Type-check and build.**
   ```bash
   cd /workspace && npm run build
   ```
   Expect zero errors. The build includes `tsc --noEmit -p tsconfig.skill-scripts.json` as part of the skill-scripts type-check step (verify with `npm run` to see the script names if needed). If the build fails on type errors, the most likely cause is a missing import or a constant rename that wasn't propagated to a consumer — chase the error message.

8. **Verify the resolver string in the bundles.** After the build:
   ```bash
   grep -l 'strikethroo' /workspace/templates/harness/skills/*/scripts/*.cjs | wc -l
   ```
   Should print `6` (all six bundles contain the new product name from the embedded error strings). If any prints `0`, the bundles were not re-emitted after the source change — re-run `npm run build`.

Edge case: if the workspace-name constant is reused by the CLI to compose paths AND by the skill-scripts resolver as a parallel definition, prefer keeping a single source of truth — if such consolidation already exists, just update the one constant. If they are duplicated, update both and leave consolidation as out-of-scope refactoring (the plan explicitly rejects gold-plating).
</details>
