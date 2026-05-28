---
id: 4
group: "documentation"
dependencies: [1, 2]
status: "completed"
created: "2026-05-18"
skills: ["technical-writing"]
---
# Update AGENTS.md skills documentation

## Objective

Make the minimal surgical update to `AGENTS.md` so the skills layer section accurately reflects the new `task-full-workflow` skill as a sixth shipping skill.

## Skills Required

- technical-writing (concise documentation edits, maintaining consistency)

## Acceptance Criteria

- [ ] `AGENTS.md` mentions `task-full-workflow` alongside `task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`, `task-refine-plan`, and `task-execute-task` in the skills list
- [ ] The `SKILL_ENTRYPOINTS` mention is updated from "five skills" to "six skills" (or whatever the current count is after this plan)
- [ ] No other documentation files are modified
- [ ] `README.md` is left untouched

## Technical Requirements

- Edit the existing AGENTS.md section that lists shipping skills (search for "The first skill is" and the list of registered entrypoints)
- Keep the change minimal: add one bullet/phrase, update one number

## Input Dependencies

- Task 1 output: `scripts/build-skills.cjs` now registers `task-full-workflow` (in addition to the five existing skills)
- Task 2 output: `templates/skills/task-full-workflow/SKILL.md` exists
- `AGENTS.md` current content

## Output Artifacts

- Updated `AGENTS.md`

## Implementation Notes

<details>

### Skills list update
Find the paragraph in AGENTS.md that currently reads something like:

> The first skill is `task-create-plan` (`templates/skills/task-create-plan/`), which encodes... The second shipping skill is `task-generate-tasks`... The third shipping skill is `task-execute-blueprint`... The fourth shipping skill is `task-refine-plan`... The fifth shipping skill is `task-execute-task`...

Add after the `task-execute-task` description:

> The sixth shipping skill is `task-full-workflow` (`templates/skills/task-full-workflow/`), which encodes the same end-to-end orchestration workflow the existing `/tasks:full-workflow` command performs: three-phase sequential execution (plan creation, task generation, blueprint execution) with context passing, progress indicators, and auto-generation fallback.

(If the AGENTS.md text uses a different enumeration style, match that style exactly.)

### Entrypoints mention update
Find the paragraph that says:

> The entrypoint → skill mapping is the `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs`, which currently registers five shipping skills.

Change "five" to "six".

### No other changes
Do not update the Architecture Overview, Quick Start, or any other section unless it explicitly enumerates skills. The README.md does not enumerate commands or skills and must remain untouched.

</details>
