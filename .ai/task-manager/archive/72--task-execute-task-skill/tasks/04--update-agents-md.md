---
id: 4
group: "documentation"
dependencies: [1, 2]
status: "completed"
created: "2026-05-18"
skills: ["technical-writing"]
status: "completed"
status: "completed"
---
# Update AGENTS.md skills documentation

## Objective

Make the minimal surgical update to `AGENTS.md` so the skills layer section accurately reflects the new `task-execute-task` skill as the fifth shipping skill.

## Skills Required

- technical-writing (concise documentation edits, maintaining consistency)

## Acceptance Criteria

- [ ] `AGENTS.md` mentions `task-execute-task` alongside `task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`, and `task-refine-plan` in the skills list
- [ ] The `SKILL_ENTRYPOINTS` mention is updated from "four skills" to "five skills"
- [ ] No other documentation files are modified
- [ ] `README.md` is left untouched

## Technical Requirements

- Edit the existing AGENTS.md section that lists shipping skills (search for "The first skill is" and the list of registered entrypoints)
- Keep the change minimal: add one bullet/phrase, update one number

## Input Dependencies

- Task 1 output: `scripts/build-skills.cjs` now registers five skills
- Task 2 output: `templates/skills/task-execute-task/SKILL.md` exists
- `AGENTS.md` current content

## Output Artifacts

- Updated `AGENTS.md`

## Implementation Notes

<details>

### Skills list update
Find the paragraph in AGENTS.md that currently reads:

> The first skill is `task-create-plan` (`templates/skills/task-create-plan/`), which encodes... The second shipping skill is `task-generate-tasks`... The third shipping skill is `task-execute-blueprint`... The fourth shipping skill is `task-refine-plan`...

Add after the `task-refine-plan` description:

> The fifth shipping skill is `task-execute-task` (`templates/skills/task-execute-plan/`), which encodes the same single-task execution workflow the existing `/tasks:execute-task` command performs.

Wait — fix the directory path: `templates/skills/task-execute-task/`.

### Entrypoints mention update
Find the paragraph that says:

> The entrypoint → skill mapping is the `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs`, which currently registers four shipping skills.

Change "four" to "five".

### No other changes
Do not update the Architecture Overview, Quick Start, or any other section unless it explicitly enumerates skills. The README.md does not enumerate commands or skills and must remain untouched.

</details>
