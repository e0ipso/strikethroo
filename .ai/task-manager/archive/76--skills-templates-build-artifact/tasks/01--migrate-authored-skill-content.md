---
id: 1
group: "migration"
dependencies: []
status: "completed"
created: "2026-05-21"
skills:
  - "bash"
---

# Migrate authored skill content to `templates/assistant/skills/`

## Objective

Relocate every tracked authored file currently under `skills/<name>/` to `templates/assistant/skills/<name>/` using `git mv` (so blame survives), then remove the now-stale working-copy `skills/` directory entirely. After this task, the repo has no top-level `skills/` directory and every `SKILL.md` (and any other authored file that exists) lives under its new home.

## Skills Required

- `bash` — `git mv`, `mkdir -p`, `rm -rf`, and basic shell scripting for the migration.

## Acceptance Criteria

- [ ] `templates/assistant/skills/<name>/SKILL.md` exists for all six skills: `task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`, `task-refine-plan`, `task-execute-task`, `task-full-workflow`.
- [ ] Each moved file shows up in `git status` as a rename (R), not as add+delete.
- [ ] The top-level `skills/` directory does not exist in the working copy (`test ! -e skills` exits 0).
- [ ] `git log --follow templates/assistant/skills/task-create-plan/SKILL.md` reaches the file's pre-migration history (blame preserved).
- [ ] No file outside `skills/` is modified by this task.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Use `git mv` per-file so git records renames; do not bulk-move with `mv` then re-add.
- The destination directories under `templates/assistant/skills/<name>/` must be created (`git mv` will create them implicitly when the destination path is given a file).
- The current `skills/<name>/scripts/` subdirectories contain git-ignored `.cjs` build outputs that are NOT tracked — they need no `git mv`; the final `rm -rf skills/` cleans them up.

## Input Dependencies

None. This task is the foundation for everything else.

## Output Artifacts

- `templates/assistant/skills/task-create-plan/SKILL.md` (and five siblings) as tracked files.
- No top-level `skills/` directory.

## Implementation Notes

<details>
<summary>Step-by-step migration</summary>

1. From the repo root, verify the current set of skills and that each has a tracked `SKILL.md`:
   ```bash
   ls skills/
   git ls-files skills/
   ```
   Expected: six subdirectories (`task-create-plan`, `task-execute-blueprint`, `task-execute-task`, `task-full-workflow`, `task-generate-tasks`, `task-refine-plan`); `git ls-files` shows one `SKILL.md` per skill (six tracked files total under `skills/`).

2. Move each tracked file with `git mv`. Doing them one at a time gives a clean per-file rename record:
   ```bash
   for skill in task-create-plan task-execute-blueprint task-execute-task task-full-workflow task-generate-tasks task-refine-plan; do
     mkdir -p "templates/assistant/skills/${skill}"
     git mv "skills/${skill}/SKILL.md" "templates/assistant/skills/${skill}/SKILL.md"
   done
   ```
   If any skill has additional tracked authored files (verify first with `git ls-files skills/${skill}/`), `git mv` those individually too. As of the plan's authoring there is only `SKILL.md` per skill.

3. After the moves, the `skills/` directory should still exist on disk because of the git-ignored `scripts/` subdirectories. Delete it outright — these are local build artifacts and will be regenerated at the new location once Task 2 is in place:
   ```bash
   rm -rf skills/
   ```

4. Verify the state:
   ```bash
   test ! -e skills && echo "OK: no top-level skills/"
   git status
   find templates/assistant/skills -type f | sort
   ```
   `git status` should show six entries of the form `renamed: skills/<name>/SKILL.md -> templates/assistant/skills/<name>/SKILL.md`. `find` should list exactly the six moved `SKILL.md` files.

5. Do NOT run `npm run build` yet — the build script still points at the old `skills/` path. Task 2 fixes that. Running the build before Task 2 lands would re-create the `skills/` directory.

</details>

<details>
<summary>Caveats</summary>

- This is the only task that touches the `skills/` tree itself. All downstream tasks operate on `templates/assistant/skills/`.
- If a contributor on another branch has uncommitted work under `skills/`, they will have to rebase and reapply under `templates/assistant/skills/`. The plan explicitly accepts this break.
- The six-skill list is hard-coded above per the current repo state. If a new skill landed between plan authoring and execution, add it to the loop.

</details>
