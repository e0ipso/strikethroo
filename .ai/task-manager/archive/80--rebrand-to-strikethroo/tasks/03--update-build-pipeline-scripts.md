---
id: 3
group: "build"
dependencies: [2]
status: "completed"
created: 2026-05-28
skills:
  - node-js
---
# Update build pipeline scripts to emit st-* artifacts

## Objective
Rewire `scripts/build-skills.cjs` and `scripts/build-skill-prompts.cjs` so the build reads from the renamed `src/skill-prompts/st-*/` and `src/skill-scripts/st-*.ts` sources and writes to the new `templates/harness/skills/st-*/` output paths.

## Skills Required
- node-js — reading and editing CommonJS build scripts; understanding the esbuild entrypoint configuration pattern.

## Acceptance Criteria
- [ ] The `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs` registers exactly six entries, each mapping `src/skill-scripts/st-<name>.ts` (entrypoint) to `templates/harness/skills/st-<name>/scripts/<bundle>.cjs` (output).
- [ ] `scripts/build-skill-prompts.cjs` either auto-discovers skills from `src/skill-prompts/*/` (preferred — confirm by reading the script) or, if it has a hardcoded skill list, that list is updated to the six `st-*` names.
- [ ] `npm run build` exits zero with no unresolved-include or missing-frontmatter validation errors after the changes in this task.
- [ ] After the build, `ls templates/harness/skills/` lists exactly the six `st-*` directories and no `task-*` directories.
- [ ] Each emitted bundle under `templates/harness/skills/st-*/scripts/*.cjs` contains the post-build assertion's expected substitutions (the `EXPECTED_WORKSPACE_SCHEMA_VERSION` smoke check in `scripts/build-skills.cjs` continues to pass).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Do not change the esbuild `define` mechanism used to substitute `EXPECTED_WORKSPACE_SCHEMA_VERSION`. Only the entrypoint and output paths move.
- Do not change bundle filenames inside each skill's `scripts/` directory — keep whatever filename pattern the current build uses (e.g., the same per-entrypoint bundle name).
- Preserve any sort/order of the `SKILL_ENTRYPOINTS` array semantics if the build relies on it.

## Input Dependencies
- Task 02 must have renamed `src/skill-prompts/*` and `src/skill-scripts/*` so this task's path updates resolve.

## Output Artifacts
- Updated `scripts/build-skills.cjs` (and `scripts/build-skill-prompts.cjs` if it had hardcoded skill names).
- A passing `npm run build` that emits the six `templates/harness/skills/st-*/` directories.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. Open `/workspace/scripts/build-skills.cjs`. Locate the `SKILL_ENTRYPOINTS` array near the top of the file. It is the single registry mapping TypeScript entrypoints to skill output directories.
2. For each of the six entries:
   - Update the entrypoint path from `src/skill-scripts/task-<name>.ts` to `src/skill-scripts/st-<name>.ts`.
   - Update the output directory from `templates/harness/skills/task-<name>` to `templates/harness/skills/st-<name>`.
   - Update any other key in the entry that names the skill (e.g., a `name` or `slug` field used by the post-build smoke check) from `task-<name>` to `st-<name>`.
3. Open `/workspace/scripts/build-skill-prompts.cjs`. Read the whole file. Determine whether it iterates `src/skill-prompts/*/` dynamically or hardcodes a skill list. If dynamic, no change to the script is required beyond the source directories already being renamed (task 02). If hardcoded, update the list to the six `st-*` names.
4. Run the build:
   ```bash
   cd /workspace && npm run build
   ```
   Expect zero errors. If the build emits `templates/harness/skills/st-*/` directories with `scripts/*.cjs` and `SKILL.md` files inside each, the rewiring is correct. If the build fails on missing input files, the most likely cause is a mismatch between the new entrypoint paths and the actual filenames produced by task 02 — cross-check with `ls src/skill-scripts/st-*.ts`.
5. Confirm the post-build smoke assertion still runs. The current build embeds an assertion that fails if `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives substitution into any bundled `.cjs`. Do not touch this assertion; it is orthogonal to the rebrand and must continue to gate the build.
6. Inspect the output directory listing:
   ```bash
   ls /workspace/templates/harness/skills/
   ```
   Must show exactly six `st-*` directories and no `task-*` directories. If a `task-*` directory reappears (e.g., because a stale entrypoint reference re-emitted it), the rewiring is incomplete — find the surviving reference in the build scripts.

If `scripts/build-skill-prompts.cjs` has post-build validation that fails when `{{include}}` directives are unresolved or when `## Operating Procedure` headings are missing, expect that validation to fail at this stage if the prompt source content still references old skill names in cross-references — that content sweep happens in task 05, not here. If the build errors with unresolved includes pointing at `task-*` names, the fix belongs in task 05, not in this task. Re-run after task 05 if needed.

Note: there is an ordering subtlety here. If `scripts/build-skill-prompts.cjs` cross-references skill names from inside the prompts (e.g., `st-full-workflow` chains to other `st-*` skills), the build may succeed structurally but emit prompts that still mention `task-*` names — that's fine for THIS task's acceptance criteria, which only requires the build to succeed and emit under the right paths. Content correctness is task 05's responsibility.
</details>
