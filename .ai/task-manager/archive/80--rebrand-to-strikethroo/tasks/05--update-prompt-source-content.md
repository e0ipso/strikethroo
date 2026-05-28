---
id: 5
group: "prompts"
dependencies: [2]
status: "completed"
created: 2026-05-28
skills:
  - documentation
complexity_score: 6
complexity_notes: "Touches six per-skill prompt directories, shared sections/ partials, cross-skill references, and src/skill-prompts/README.md. Volume is the complexity, not subtlety."
---
# Update prompt source content to reference Strikethroo and st-* skills

## Objective
Rewrite the assembled-prompt sources under `src/skill-prompts/` so each skill's emitted `SKILL.md` self-identifies under its new `st-*` name, references the new workspace path `.ai/strikethroo/`, points to the renamed workspace seed config files, and chains correctly to the other renamed skills.

## Skills Required
- documentation — prose and Markdown updates across many small files, with attention to identifier consistency.

## Acceptance Criteria
- [ ] Each per-skill source template in `src/skill-prompts/st-*/` references its OWN new skill name in its `name:` frontmatter and in any headings or self-referential prose. None of the six retains `task-<name>` in its own frontmatter `name:` field.
- [ ] Every shared partial under `src/skill-prompts/sections/` (or wherever cross-skill includes live) references the workspace path as `.ai/strikethroo/` and the workspace-seed config file by its new name (`STRIKETHROO.md`, per task 07). No partial retains `.ai/task-manager/` or `TASK_MANAGER.md`.
- [ ] The `st-full-workflow` source template chains to `st-create-plan` → `st-generate-tasks` → `st-execute-blueprint` (the new names), not the old `task-*` names.
- [ ] `src/skill-prompts/README.md` examples and skill-author guidance use `st-*` examples and reference `.ai/strikethroo/`.
- [ ] After `npm run build`, every emitted `templates/harness/skills/st-*/SKILL.md` file passes the build's existing validation gates (no unresolved `{{include}}` directives, no missing frontmatter fields, no missing `## Operating Procedure` heading).
- [ ] `grep -rEn 'ai-task-manager|AI Task Manager|task-manager|\.ai/task-manager|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)' src/skill-prompts/` returns no hits except for intentional historical references (none expected; surface any found).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Do not edit any file under `templates/harness/skills/` directly — those are generated and will be re-emitted by `npm run build`.
- Preserve the `{{include}}` directive syntax and the `{{variable}}` substitution pattern. Only content within the templates and partials changes.
- Preserve domain vocabulary (work order, plan, blueprint, phase, task, sub-agent). The word "task" in the domain sense stays. Skill names like `st-generate-tasks` and `st-execute-task` keep "task" in their identifiers.

## Input Dependencies
- Task 02 must have renamed `src/skill-prompts/task-*/` to `src/skill-prompts/st-*/` so this task edits the right files.

## Output Artifacts
- Updated per-skill source templates under `src/skill-prompts/st-*/`.
- Updated shared partials under `src/skill-prompts/sections/`.
- Updated `src/skill-prompts/README.md`.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. **Inventory the surface.**
   ```bash
   find /workspace/src/skill-prompts -type f -name '*.md'
   ```
   This lists every source template and partial. Expect:
   - Six per-skill source templates under `src/skill-prompts/st-*/` (one or more `.md` files each).
   - Shared partials under `src/skill-prompts/sections/`.
   - `src/skill-prompts/README.md`.

2. **Per-skill source templates.** For each of the six `st-*` directories:
   - Open every `.md` file inside.
   - In the YAML frontmatter, update `name:` field from `task-<rest>` to `st-<rest>`.
   - In the `description:` field, update any reference to the product label ("AI Task Manager" → "Strikethroo") and to the workspace path (`.ai/task-manager/` → `.ai/strikethroo/`).
   - In the prose body, update any first-person self-references (e.g., "this is the task-create-plan skill" → "this is the st-create-plan skill").
   - Headings that name the skill (e.g., `# task-create-plan`) are updated to the new name.

3. **Shared partials under `src/skill-prompts/sections/`.** These include procedural blocks like root discovery, plan resolution, phase execution, test philosophy, task minimization. Grep first:
   ```bash
   grep -rEn 'ai-task-manager|AI Task Manager|task-manager|\.ai/task-manager|TASK_MANAGER\.md' /workspace/src/skill-prompts/sections/
   ```
   For each hit:
   - `.ai/task-manager/` → `.ai/strikethroo/`
   - `npx @e0ipso/ai-task-manager init` → `npx strikethroo init`
   - `npx skills add e0ipso/ai-task-manager` → `npx skills add e0ipso/strikethroo`
   - `AI Task Manager` (product label) → `Strikethroo`
   - `task-manager` (in path or product label context) → `strikethroo` (in path) or `Strikethroo` (in product label) — judge from context
   - `TASK_MANAGER.md` (workspace seed config file) → `STRIKETHROO.md` — this is the filename rename task 07 performs

4. **Cross-skill chaining.** Specifically check the `st-full-workflow` source template. It chains three other skills in the documented order:
   - Step 1 currently mentions `task-create-plan` → change to `st-create-plan`.
   - Step 2 currently mentions `task-generate-tasks` → change to `st-generate-tasks`.
   - Step 3 currently mentions `task-execute-blueprint` → change to `st-execute-blueprint`.
   Also check `st-execute-task` (single-task variant) and `st-refine-plan` for cross-references.

   Run a focused grep:
   ```bash
   grep -rEn 'task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)' /workspace/src/skill-prompts/
   ```
   Every hit must become `st-<rest>`.

5. **`src/skill-prompts/README.md`.** This is the skill-author guide. It contains:
   - Example snippets that name `task-*` skills — update to `st-*`.
   - Workspace path references — update.
   - Install command examples — update.

6. **Build and validate.**
   ```bash
   cd /workspace && npm run build
   ```
   The post-build validation in `scripts/build-skill-prompts.cjs` fails on unresolved `{{include}}` directives, missing frontmatter fields, or absent `## Operating Procedure` headings. If it fails, the error message names the offending file — fix and re-run.

7. **Final identifier sweep within the prompts tree.**
   ```bash
   grep -rEn 'ai-task-manager|AI Task Manager|task-manager|\.ai/task-manager|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|TASK_MANAGER\.md' /workspace/src/skill-prompts/
   ```
   This should return no hits. Any hit is either a miss to fix or an intentional exception to surface in the task completion summary.

Edge case: The word "task" stand-alone is domain vocabulary and must NOT be replaced. Only the `task-` prefix on skill names, the product label "AI Task Manager", the path segment `task-manager`, and the workspace-seed config filename `TASK_MANAGER.md` move. Phrases like "atomic task", "task ID", "task file", "task generation" stay.
</details>
