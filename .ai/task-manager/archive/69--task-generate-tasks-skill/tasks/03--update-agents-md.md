---
id: 3
group: "documentation"
dependencies: []
status: "completed"
created: 2026-05-14
skills:
  - markdown
---
# Document task-generate-tasks Skill in AGENTS.md

## Objective
Make the surgical update to `AGENTS.md` that plan 69 calls for: add `task-generate-tasks` alongside `task-create-plan` as a shipping skill, and confirm the existing prose about `SKILL_ENTRYPOINTS` reads correctly with two skills.

## Skills Required
- `markdown` — small, focused edits to existing documentation prose.

## Acceptance Criteria
- [ ] The "Skills Layer" section of `AGENTS.md` mentions both `task-create-plan` and `task-generate-tasks` as shipping skills.
- [ ] No claim that the build pipeline supports "multiple skills" is contradicted or duplicated — the existing language already covers multi-skill mode; verify and adjust only as needed.
- [ ] No other section of `AGENTS.md` is changed.
- [ ] `README.md` is **not** modified (plan 69 explicitly says no README change).

## Technical Requirements
- The change is additive prose; do not move, delete, or restructure existing sections.

## Input Dependencies
None — relies only on existing `AGENTS.md` content.

## Output Artifacts
- Updated `AGENTS.md` (one diff hunk in the Skills Layer section, ideally < 5 lines).

## Implementation Notes

<details>

Open `AGENTS.md`, find the section starting with "## Skills Layer" (search for that exact heading). The current sentence reads (paraphrased): "The first skill is `task-create-plan` (...)" — keep that sentence and add a follow-on sentence noting `task-generate-tasks` (`templates/skills/task-generate-tasks/`) is the second shipping skill, encoding the workflow currently exposed via the `/tasks:generate-tasks` command. Both skills coexist with their corresponding command paths, which remain unchanged.

If the document includes a "registered entrypoints" list (search for `SKILL_ENTRYPOINTS`), no enumeration change is necessary — the existing prose framing the array as the registry for current and future skills already accommodates the new entries. Only adjust if the prose is now misleading (e.g., says "currently one entry").

Do not edit other sections. Do not edit `README.md`. Run `npm run lint` after editing; markdown lint, if configured, should pass.

</details>
