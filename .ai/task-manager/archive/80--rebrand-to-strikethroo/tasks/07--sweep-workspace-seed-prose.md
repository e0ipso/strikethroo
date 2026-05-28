---
id: 7
group: "prose"
dependencies: [2]
status: "completed"
created: 2026-05-28
skills:
  - documentation
---
# Sweep workspace seed prose and rename TASK_MANAGER.md

## Objective
Update every Markdown file under `templates/strikethroo/config/` (hooks, templates, and the renamed top-level workspace config file) so the workspace seed copied by `init` carries Strikethroo branding and the new workspace path.

## Skills Required
- documentation — Markdown rewrites across hook docs, template files, and one filename rename.

## Acceptance Criteria
- [ ] `templates/strikethroo/config/TASK_MANAGER.md` is renamed (via `git mv`) to `templates/strikethroo/config/STRIKETHROO.md`.
- [ ] The renamed `STRIKETHROO.md` references the product as "Strikethroo" and shows directory-tree examples using `.ai/strikethroo/` (not `.ai/task-manager/`). The `find` command snippet in this file uses the new path.
- [ ] Every file under `templates/strikethroo/config/hooks/*.md` references the product as "Strikethroo" and any workspace-path references read `.ai/strikethroo/`.
- [ ] Every file under `templates/strikethroo/config/templates/*.md` references the product as "Strikethroo" where the product name appears; domain vocabulary (task, plan, phase, blueprint, work order) is preserved.
- [ ] `grep -rEn 'ai-task-manager|AI Task Manager|task-manager|TASK_MANAGER\.md|\.ai/task-manager' /workspace/templates/strikethroo/` returns no hits.
- [ ] Domain glossary terms (work order, plan, task, blueprint, phase, sub-agent) appear unchanged wherever they previously appeared.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Use `git mv` for the `TASK_MANAGER.md` → `STRIKETHROO.md` rename so git records it as a rename.
- Do not touch the filenames of hooks (e.g., `PRE_PLAN.md`, `POST_PLAN.md`, etc.) — those are workspace-shape contracts that the skill-side resolver looks up by exact name. Only the content inside them is edited.
- Do not introduce new files. The workspace seed shape is unchanged except for the one filename rename.

## Input Dependencies
- Task 02 must have renamed `templates/ai-task-manager/` to `templates/strikethroo/` so the paths in this task resolve.

## Output Artifacts
- Updated and renamed `templates/strikethroo/config/STRIKETHROO.md`.
- Updated `templates/strikethroo/config/hooks/*.md`.
- Updated `templates/strikethroo/config/templates/*.md`.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. **Inventory the surface.**
   ```bash
   find /workspace/templates/strikethroo/config -type f -name '*.md'
   ```
   Expect:
   - `templates/strikethroo/config/TASK_MANAGER.md` (about to be renamed)
   - Several files under `templates/strikethroo/config/hooks/` (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_TASK_GENERATION_ALL, POST_EXECUTION, POST_ERROR_DETECTION).
   - Several files under `templates/strikethroo/config/templates/` (PLAN_TEMPLATE.md, TASK_TEMPLATE.md, possibly BLUEPRINT_TEMPLATE.md).

2. **Rename TASK_MANAGER.md.**
   ```bash
   cd /workspace
   git mv templates/strikethroo/config/TASK_MANAGER.md templates/strikethroo/config/STRIKETHROO.md
   ```

3. **Edit the renamed STRIKETHROO.md.**
   - Title and headings: update from "Task Manager General Information" to "Strikethroo General Information" (or equivalent).
   - The `find .ai/task-manager/{plans,archive} ...` snippet → `find .ai/strikethroo/{plans,archive} ...`.
   - The directory tree illustration showing `.ai/task-manager/plans/...` → `.ai/strikethroo/plans/...`.
   - Any prose referring to "the task-manager system" or similar → "Strikethroo" or "the Strikethroo workspace" (judge from context).
   - Domain nouns (plans, tasks, phases, blueprints, archive, work order) stay verbatim.

4. **Hook files under `templates/strikethroo/config/hooks/*.md`.**
   - Grep first to scope:
     ```bash
     grep -rEn 'ai-task-manager|AI Task Manager|task-manager|TASK_MANAGER\.md|\.ai/task-manager' /workspace/templates/strikethroo/config/hooks/
     ```
   - For each hit:
     - Path `.ai/task-manager/` → `.ai/strikethroo/`
     - Filename reference `TASK_MANAGER.md` → `STRIKETHROO.md`
     - Product label "AI Task Manager" → "Strikethroo" (only the product label; not the domain term "task")
     - `task-manager` in path-like contexts → `strikethroo`
   - Hook filenames themselves are NOT renamed.

5. **Template files under `templates/strikethroo/config/templates/*.md`.**
   - Grep first:
     ```bash
     grep -rEn 'ai-task-manager|AI Task Manager|task-manager|TASK_MANAGER\.md|\.ai/task-manager' /workspace/templates/strikethroo/config/templates/
     ```
   - Apply the same substitution rules as for hooks.
   - Be careful: `PLAN_TEMPLATE.md` and `TASK_TEMPLATE.md` may contain example frontmatter using domain terms — keep those as-is. Only the product label and paths move.

6. **Final sweep.**
   ```bash
   grep -rEn 'ai-task-manager|AI Task Manager|task-manager|TASK_MANAGER\.md|\.ai/task-manager' /workspace/templates/strikethroo/
   ```
   Must return no hits. Any remaining hit is either a missed substitution or a previously unanticipated reference — surface it.

Edge case: the `PRE_TASK_*` and `POST_TASK_*` hook filenames contain the word "task" — these are domain hook names, not product references. Do NOT rename them. The directory `hooks/` is also a domain term, not a product reference.

Note on consumer updates: any prompt source that reads `TASK_MANAGER.md` by name is updated to read `STRIKETHROO.md` instead. That work happens in task 05 (prompt source content). This task only renames the file and rewrites its contents.
</details>
