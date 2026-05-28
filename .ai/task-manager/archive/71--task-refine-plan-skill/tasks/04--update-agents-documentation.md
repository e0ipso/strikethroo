---
id: 4
group: "documentation"
dependencies: [2]
status: "completed"
created: "2026-05-18"
skills: ["documentation"]
---
# Update AGENTS.md to document task-refine-plan

## Objective
Make a surgical update to `AGENTS.md` to reflect the new `task-refine-plan` skill and the updated `SKILL_ENTRYPOINTS` registry size.

## Skills Required
- `documentation`: Updating technical documentation in place without changing surrounding structure.

## Acceptance Criteria
- [ ] The paragraph in `AGENTS.md` that lists shipping skills now includes `task-refine-plan` alongside `task-create-plan`, `task-generate-tasks`, and `task-execute-blueprint`.
- [ ] Any mention of the `SKILL_ENTRYPOINTS` array count is updated from "three skills" / "three shipping skills" to "four skills" / "four shipping skills".
- [ ] No other sections of `AGENTS.md` are modified.
- [ ] The change is minimal and preserves existing formatting.

## Technical Requirements
- Edit only the relevant lines in `AGENTS.md`.
- Do not restructure sections or change headings.

## Input Dependencies
- Task 2 should be complete so the skill artifact exists and its path is confirmed.

## Output Artifacts
- Modified `AGENTS.md`

## Implementation Notes
<details>
1. Open `AGENTS.md`.
2. Search for the paragraph near line 283 that begins "The first skill is `task-create-plan`..." and lists the three existing skills.
3. Update it to mention the fourth skill:
   - "The fourth shipping skill is `task-refine-plan` (`templates/skills/task-refine-plan/`), which encodes the same plan-refinement workflow the existing `/tasks:refine-plan` and `/tasks:refine-plan-auto` commands perform. Each skill coexists with its corresponding command; the command paths are unchanged."
4. Search for any other mentions of "three skills" or "three shipping skills" in the skills section and update to "four".
5. Save and verify with `git diff` that only the intended lines changed.
</details>
