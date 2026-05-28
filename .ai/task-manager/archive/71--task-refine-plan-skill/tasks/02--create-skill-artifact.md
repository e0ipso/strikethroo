---
id: 2
group: "skill-artifact"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["documentation"]
---
# Create task-refine-plan skill artifact (SKILL.md)

## Objective
Create a standards-compliant `SKILL.md` for the `task-refine-plan` skill under `templates/skills/task-refine-plan/SKILL.md`. The skill encodes the same plan-refinement workflow the existing `/tasks:refine-plan` and `/tasks:refine-plan-auto` commands perform, covering both interactive and autonomous clarification modes in a single artifact.

## Skills Required
- `documentation`: Authoring structured, assistant-agnostic skill prose that preserves the exact contract of the existing command templates.

## Acceptance Criteria
- [ ] A new directory `templates/skills/task-refine-plan/` exists with a single `SKILL.md` file inside it.
- [ ] The `SKILL.md` frontmatter contains:
  - `name: task-refine-plan`
  - A `description` that is specific to plan refinement for the AI Task Manager (not generic brainstorming).
- [ ] The skill is assistant-agnostic: no `$ARGUMENTS`, no `$1`, no assistant-specific syntax. The user supplies the plan ID conversationally.
- [ ] The operating procedure includes these stages in order:
  1. Locate the task-manager root via `scripts/find-task-manager-root.cjs`
  2. Resolve the plan via `scripts/validate-plan-blueprint.cjs <plan-id> planFile`
  3. Load project context (`TASK_MANAGER.md`, `PRE_PLAN.md`, `PLAN_TEMPLATE.md`)
  4. Baseline Review
  5. Clarification Loop with two distinct subsections:
     - **Interactive Clarification** (asks user targeted questions, pre-fills answers, stops and waits for input)
     - **Autonomous Clarification** (resolves gaps via codebase inspection, records findings as "auto-resolved" or "assumption")
  6. Refinement Implementation (preserve plan identity, structure compliance, content updates, net-new sections, change log, validation hooks)
  7. Run `POST_PLAN.md`
  8. Emit the structured `Plan Refinement Summary` block
- [ ] Every script reference uses a relative path from the skill root (e.g., `scripts/find-task-manager-root.cjs`).
- [ ] The skill clearly states identity-preservation rules: same plan ID, same directory, no new plan created.
- [ ] The skill explains how to update the "Plan Clarifications" table and append a change log in the `Notes` section.
- [ ] The skill ends with the exact required `Plan Refinement Summary` block format:
  ```
  ---

  Plan Refinement Summary:
  - Plan ID: [numeric-id]
  - Plan File: [absolute-path-to-plan-file]
  ```
- [ ] Failure modes are documented (no root found, plan ID does not resolve, etc.).

## Technical Requirements
- Follow the writing style and depth of the existing three skills (`task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`).
- The clarification stage must clearly branch so an assistant can select the appropriate mode based on context.
- Do not introduce any new scripts or logic; reuse the two bundled scripts.

## Input Dependencies
None — this is a standalone authoring task. Reference the existing command templates at `templates/assistant/commands/tasks/refine-plan.md` and `refine-plan-auto.md` as the contract.

## Output Artifacts
- `templates/skills/task-refine-plan/SKILL.md`

## Implementation Notes
<details>
1. Read `templates/assistant/commands/tasks/refine-plan.md` and `refine-plan-auto.md` carefully. Extract the Total Clarification Algorithm, Autonomous Clarification Algorithm, Stage 3 refinement rules, and output format.
2. Read `templates/skills/task-create-plan/SKILL.md`, `task-generate-tasks/SKILL.md`, and `task-execute-blueprint/SKILL.md` to match tone, section depth, and formatting.
3. Write `SKILL.md` frontmatter exactly as specified.
4. In the operating procedure, structure the clarification stage with clear subheadings for Interactive and Autonomous modes. Both branches must converge on the same Refinement Implementation stage.
5. Ensure all script paths are relative to the skill root.
6. End with the exact `Plan Refinement Summary` block format; do not deviate.
7. Verify that no assistant-specific syntax (like `$ARGUMENTS` or `$1`) appears in the document.
</details>
