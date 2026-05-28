---
id: 2
group: skill-extension
dependencies: []
status: completed
created: '2026-05-19'
skills:
  - documentation
---

# Update AGENTS.md Documentation

## Objective

Make a surgical update to `AGENTS.md` in the Skills Layer section so that `task-create-plan` is documented as covering both `/tasks:create-plan` and `/tasks:create-plan-auto`.

## Skills Required

- **documentation**: Precise, minimal prose editing that preserves all surrounding context.

## Acceptance Criteria

- [ ] The Skills Layer paragraph that lists `task-create-plan` is updated to mention that it covers both the interactive and auto commands.
- [ ] No other sections of `AGENTS.md` are modified.
- [ ] The update is minimal — a single clause or phrase addition, not a rewrite.
- [ ] All existing formatting, line breaks, and markdown structure are preserved.

## Technical Requirements

- The change must be localized to the Skills Layer section (around line 283 in AGENTS.md).
- The current prose reads: "The first skill is `task-create-plan` (`templates/skills/task-create-plan/`), which encodes the same plan-creation workflow the existing `/tasks:create-plan` command performs."
- The updated prose should note that it covers both `/tasks:create-plan` and `/tasks:create-plan-auto`, consistent with how `task-refine-plan` is already documented as covering both `/tasks:refine-plan` and `/tasks:refine-plan-auto`.

## Input Dependencies

- Plan 74 document.
- Current `AGENTS.md`.

## Output Artifacts

- Modified `AGENTS.md` with updated Skills Layer description for `task-create-plan`.

## Implementation Notes

<details>
<summary>Click to expand detailed instructions for the non-thinking executor</summary>

1. Open `AGENTS.md`.
2. Navigate to the Skills Layer section (around line 283).
3. Locate the sentence: "The first skill is `task-create-plan` (`templates/skills/task-create-plan/`), which encodes the same plan-creation workflow the existing `/tasks:create-plan` command performs."
4. Replace that sentence with:

   ```markdown
   The first skill is `task-create-plan` (`templates/skills/task-create-plan/`), which encodes the same plan-creation workflow the existing `/tasks:create-plan` command performs, as well as the autonomous `/tasks:create-plan-auto` variant.
   ```

   Or a similarly minimal variation that mentions both commands.

5. Verify no other changes were made to the file.
6. Ensure the file ends with a single newline and has no trailing spaces.
</details>
