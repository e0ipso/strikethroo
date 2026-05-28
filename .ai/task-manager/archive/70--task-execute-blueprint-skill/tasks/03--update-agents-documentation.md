---
id: 3
group: "documentation"
dependencies: [2]
status: "completed"
created: "2026-05-18"
skills:
  - "markdown"
---
# Update AGENTS.md to document task-execute-blueprint as a shipping skill

## Objective
Make a small, surgical update to the `AGENTS.md` skills layer section so it lists `task-execute-blueprint` alongside `task-create-plan` and `task-generate-tasks` as a shipping skill, and updates the `SKILL_ENTRYPOINTS` description to reflect three registered skills.

## Skills Required
- `markdown` — surgical documentation editing

## Acceptance Criteria
- [ ] `AGENTS.md` mentions `task-execute-blueprint` in the skills layer section alongside `task-create-plan` and `task-generate-tasks`
- [ ] If `AGENTS.md` enumerates registered entrypoints, the list is updated to include the three `task-execute-blueprint` entries
- [ ] If `AGENTS.md` only mentions the `SKILL_ENTRYPOINTS` array, the text is updated to note it now contains entries for three skills
- [ ] No other `AGENTS.md` sections are modified unless explicitly required by the change
- [ ] No `README.md` changes are made

## Technical Requirements
- Preserve existing formatting, line breaks, and list structures
- Keep the description of the build pipeline and distribution strategy unchanged; only add the third skill name where appropriate

## Input Dependencies
- `AGENTS.md` from the repository root
- Task 2 output: `templates/skills/task-execute-blueprint/SKILL.md` (to confirm the skill name)

## Output Artifacts
- Updated `/workspace/AGENTS.md`

## Implementation Notes

<details>

### Where to edit in AGENTS.md

1. Search the `AGENTS.md` file for the skills layer section. Look for text like:
   - "The first skill is `task-create-plan`"
   - "The second shipping skill is `task-generate-tasks`"

2. Add a parallel mention of the third skill, e.g.:
   > The third shipping skill is `task-execute-blueprint` (`templates/skills/task-execute-blueprint/`), which encodes the same execution-orchestration workflow the existing `/tasks:execute-blueprint` command performs.

3. Find the paragraph that describes `SKILL_ENTRYPOINTS`. Update any sentence that says "two skills" or lists two skills to say "three skills" and include `task-execute-blueprint`.

4. Do not change any other documentation files.

</details>
