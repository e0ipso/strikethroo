---
id: 2
group: "renames"
dependencies: []
status: "completed"
created: 2026-05-28
skills:
  - git
complexity_score: 5
complexity_notes: "Touches three source trees plus deletes six stale output directories. Mechanical but high-volume."
---
# Rename source-of-truth directories and delete stale output directories

## Objective
Move every authored source tree to the new Strikethroo names so the build pipeline emits artifacts under the correct paths, and remove the obsolete `templates/harness/skills/task-*/` output directories so they cannot ship as dead code.

## Skills Required
- git — `git mv` for tracked renames and `git rm -r` for stale output dirs; preserves history without ad-hoc moves.

## Acceptance Criteria
- [ ] `src/skill-prompts/task-create-plan/` is renamed to `src/skill-prompts/st-create-plan/`.
- [ ] `src/skill-prompts/task-generate-tasks/` is renamed to `src/skill-prompts/st-generate-tasks/`.
- [ ] `src/skill-prompts/task-execute-blueprint/` is renamed to `src/skill-prompts/st-execute-blueprint/`.
- [ ] `src/skill-prompts/task-execute-task/` is renamed to `src/skill-prompts/st-execute-task/`.
- [ ] `src/skill-prompts/task-refine-plan/` is renamed to `src/skill-prompts/st-refine-plan/`.
- [ ] `src/skill-prompts/task-full-workflow/` is renamed to `src/skill-prompts/st-full-workflow/`.
- [ ] Six TypeScript entrypoints `src/skill-scripts/task-*.ts` are renamed to `src/skill-scripts/st-*.ts` (matching the six skill names above).
- [ ] `templates/ai-task-manager/` is renamed to `templates/strikethroo/`.
- [ ] All six `templates/harness/skills/task-*/` directories are removed from the working tree via `git rm -r`.
- [ ] `git status` shows the renames as renames (not adds + deletes) where possible — confirms history preservation.
- [ ] No content edits are performed in this task; this is rename + delete only. Internal file contents are addressed by downstream tasks.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Use `git mv <old> <new>` for every directory and file rename so git records them as renames.
- Use `git rm -r <path>` to delete the stale output directories — do not leave them untracked.
- If git refuses a rename because the target already exists or because of case-only changes on case-insensitive filesystems, surface the error rather than working around it.

## Input Dependencies
- None.

## Output Artifacts
- Renamed directories under `src/skill-prompts/`, `src/skill-scripts/`, and `templates/`.
- Six deleted `templates/harness/skills/task-*/` directories.

## Implementation Notes
<details>
<summary>Execution detail</summary>

The six skill name mappings are:

| Old | New |
|-----|-----|
| `task-create-plan` | `st-create-plan` |
| `task-generate-tasks` | `st-generate-tasks` |
| `task-execute-blueprint` | `st-execute-blueprint` |
| `task-execute-task` | `st-execute-task` |
| `task-refine-plan` | `st-refine-plan` |
| `task-full-workflow` | `st-full-workflow` |

Run from `/workspace`. The exact list of entrypoint files in `src/skill-scripts/` should be confirmed with `ls src/skill-scripts/task-*.ts` before renaming; the plan asserts there are six, but trust the filesystem.

Step-by-step:

1. **Prompt source directories.** For each of the six mappings:
   ```bash
   git mv src/skill-prompts/task-<rest> src/skill-prompts/st-<rest>
   ```
2. **TypeScript entrypoints.** List actual files first:
   ```bash
   ls src/skill-scripts/task-*.ts
   ```
   Then rename each:
   ```bash
   git mv src/skill-scripts/task-<rest>.ts src/skill-scripts/st-<rest>.ts
   ```
   If the filesystem contains `task-*.ts` files matching all six skills, this should produce six renames. If the count differs, stop and surface the discrepancy — do not invent renames.
3. **Workspace seed template.**
   ```bash
   git mv templates/ai-task-manager templates/strikethroo
   ```
4. **Stale output directories.** These contain generated `.cjs` bundles and assembled `SKILL.md` files that are git-ignored on `main` but currently materialized on disk. They must be removed from the working tree so the next build does not leave them alongside the new `st-*` outputs. Use:
   ```bash
   rm -rf templates/harness/skills/task-create-plan
   rm -rf templates/harness/skills/task-generate-tasks
   rm -rf templates/harness/skills/task-execute-blueprint
   rm -rf templates/harness/skills/task-execute-task
   rm -rf templates/harness/skills/task-refine-plan
   rm -rf templates/harness/skills/task-full-workflow
   ```
   `git rm -r` would fail because the contents are git-ignored; `rm -rf` is the correct tool. If any of these directories contains a non-git-ignored file (verify with `git ls-files templates/harness/skills/task-<name>` before deleting), stop and surface that finding — the plan does not expect tracked files here.

5. **Verify.**
   ```bash
   ls templates/harness/skills/
   ```
   Output should NOT contain any `task-*` directories. It may be empty (the new `st-*` directories are emitted later by the build) or it may already contain partial new outputs from previous experimentation; either is acceptable for this task.

   ```bash
   ls src/skill-prompts/ | grep -E '^task-' || echo "clean"
   ls src/skill-scripts/ | grep -E '^task-' || echo "clean"
   ```
   Both should print `clean`.

6. **Do not edit file contents.** Internal references to the old names inside the renamed directories are addressed by tasks 03, 04, and 05. Keep this task purely structural.

If a file inside one of the renamed `src/skill-prompts/st-*/` directories contains the substring `task-` in its filename (e.g., a partial that was named after the old skill), rename it in lockstep with `git mv`. Verify with `find src/skill-prompts/ -name 'task-*'` after the directory renames — output should be empty.
</details>
