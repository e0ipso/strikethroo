---
id: 2
group: "skill-artifact"
dependencies: []
status: "completed"
created: 2026-05-14
skills:
  - markdown
---
# Author task-generate-tasks SKILL.md

## Objective
Create `templates/skills/task-generate-tasks/SKILL.md` — the authored prose half of the new Agent Skill. The skill encodes the same workflow the `/tasks:generate-tasks` command performs today, expressed as assistant-agnostic skill prose and referencing the bundled scripts that will land under the skill's `scripts/` directory at build time.

## Skills Required
- `markdown` — authoring a standards-compliant `SKILL.md` with valid frontmatter and procedural prose.

## Acceptance Criteria
- [ ] File exists at `templates/skills/task-generate-tasks/SKILL.md`.
- [ ] Frontmatter `name` equals `task-generate-tasks` and matches the directory name.
- [ ] Frontmatter `description` is specific to task generation for the AI Task Manager (not generic).
- [ ] Operating procedure covers: locate root → resolve plan → load plan body + `TASK_TEMPLATE.md` → analyze + decompose → minimize → allocate task IDs → emit task files → run `POST_TASK_GENERATION_ALL.md` → emit summary.
- [ ] Carries forward the existing command's minimization principles, skill-selection guidance, dependency-analysis rules, and the "write a few tests, mostly integration" test philosophy — expressed as skill prose, not as `/tasks:`-style slash-command instructions.
- [ ] Every script reference is relative to the skill root (e.g. `scripts/validate-plan-blueprint.cjs`, `scripts/get-next-task-id.cjs`, `scripts/find-task-manager-root.cjs`). No assistant-specific tokens (`$ARGUMENTS`, `$1`) appear in the body.
- [ ] The final required block is the exact `Task Generation Summary` structure (Plan ID, Tasks count, Status).

## Technical Requirements
- The skill must be assistant-agnostic. Plan ID comes from the user conversationally, not from a slash-command argument.
- The skill must be self-contained: all script invocations are relative paths under `scripts/`.
- The skill must instruct emitting Markdown task files conforming to `<root>/config/templates/TASK_TEMPLATE.md`, written to `<root>/plans/<plan-dir>/tasks/{padded-id}--{slug}.md`.

## Input Dependencies
- The existing `/workspace/.claude/commands/tasks/generate-tasks.md` command (contract reference).
- The existing `templates/skills/task-create-plan/SKILL.md` (style reference).

## Output Artifacts
- `templates/skills/task-generate-tasks/SKILL.md`

## Implementation Notes

<details>

### Style and structure

Mirror the structure of `templates/skills/task-create-plan/SKILL.md`:

1. Frontmatter (`---` ... `---`) with `name:` and a description that names this task-manager specifically and limits the skill to task generation. Example shape: "Generate atomic Markdown tasks for an existing AI Task Manager plan in this repository. Use when the user asks to decompose a plan by ID, locate the .ai/task-manager root, allocate sequential task IDs, and emit task files conforming to TASK_TEMPLATE.md. Do not use for generic project planning or work outside the AI Task Manager."
2. Brief intro paragraph noting assistant-agnostic and self-contained nature.
3. `## Inputs` section: user supplies the plan ID; treat as authoritative.
4. `## Operating Procedure` with numbered subsections — each maps to a step in the command. Reference scripts by relative path (`scripts/<name>.cjs`).
5. `## Failure Modes` covering: no task-manager root; plan ID not found; user-declined clarification; helper script error.

### Steps to cover in the operating procedure

Carry these forward from `/workspace/.claude/commands/tasks/generate-tasks.md` and the command's referenced documents:

- **Locate root**: run `scripts/find-task-manager-root.cjs`. On non-zero exit, stop and instruct the user to initialize the task manager. The printed path is `<root>` for all subsequent references.
- **Resolve plan**: run `scripts/validate-plan-blueprint.cjs <planId> planFile` — print result is the absolute plan file path. If the script fails, stop and ask the user to verify the plan ID. Also note the optional `planDir`, `taskCount`, `blueprintExists`, `taskManagerRoot`, `planId` fields available from the same script.
- **Load context**: read `<root>/config/TASK_MANAGER.md` for directory conventions; read the plan body from the path resolved above; read `<root>/config/templates/TASK_TEMPLATE.md` to know what each task file must contain.
- **Decompose**: include the minimization principles (verbatim or near-verbatim from the command):
  - Create only the minimum number of tasks necessary; target 20–30% reduction from comprehensive lists.
  - Direct Implementation Only; DRY Task Principle; Question Everything; Avoid Gold-plating.
  - Antipatterns: separate error-handling tasks, splitting trivial operations, future-extensibility tasks, comprehensive tests for trivial functionality.
- **Granularity**: each task is single-purpose, atomic, skill-specific (1–2 skills max), verifiable.
- **Skill selection**: 1–2 specific kebab-case skills, automatically inferred from objectives. Examples list verbatim from the command. Split-if-3+ guidance.
- **Test philosophy**: "write a few tests, mostly integration." When TO write, when NOT to. Combine related scenarios into single tasks. Carry this prose forward — it's a quality constraint not just a style note.
- **Dependency analysis**: hard vs. soft dependencies, no circular dependencies, dependency rule (B depends on A if B requires output/artifacts from A, modifies code from A, or tests functionality from A).
- **Frontmatter schema**: enumerate required fields (id, group, dependencies, status, created, skills). Optional: complexity_score, complexity_notes.
- **Allocate task IDs**: run `scripts/get-next-task-id.cjs <planId>` to obtain the first ID, then increment in-process for subsequent files in the same generation pass.
- **Emit task files**: write each task at `<root>/plans/<plan-dir>/tasks/{padded-id}--{slug}.md` using `<root>/config/templates/TASK_TEMPLATE.md`. The slug is lowercase, alphanumeric/hyphens, derived from task title.
- **Run POST_TASK_GENERATION_ALL hook**: read and follow `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` (complexity sanity, append blueprint with mermaid graph + phases to the plan file).
- **Validation checklist**: enumerate the core checks the command lists (1–2 skills assigned; acyclic deps; sequential unique IDs; minimization applied; no circular deps; etc.). Skill prose, not a slash-command checklist.

### Final required block

End the SKILL.md with the **exact** required summary block (literally the format, not a placeholder), instructing the skill runner to emit:

```
---
Task Generation Summary:
- Plan ID: [numeric-id]
- Tasks: [count]
- Status: Ready for execution
```

### Things to avoid

- Do **not** reference `$ARGUMENTS` or `$1`.
- Do **not** include slash-command frontmatter (`argument-hint`, `description:` at the top reading like a CLI hint). The frontmatter is the Agent-Skills shape (`name`, `description`), as in the task-create-plan skill.
- Do **not** introduce HTML task output. Plan 69 explicitly keeps tasks as Markdown.
- Do **not** modify the existing `task-create-plan` skill or any command template.

</details>
