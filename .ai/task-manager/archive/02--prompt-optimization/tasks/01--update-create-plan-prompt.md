---
id: 1
group: "prompt-updates"
dependencies: []
status: "completed"
created: "2025-09-01"
---

# Task 01: Update create-plan.md Prompt

## Objective
Add scope control and simplicity guidelines to the create-plan.md template to prevent feature creep and unnecessary complexity in generated plans.

## Acceptance Criteria
- [ ] Scope control section added with explicit warnings against feature creep
- [ ] Language about "implementing ONLY what is explicitly requested" included
- [ ] Simplicity guidelines section added emphasizing maintainability
- [ ] Examples of common scope creep patterns documented
- [ ] Existing prompt functionality preserved

## Technical Requirements
- Edit `/workspace/templates/commands/tasks/create-plan.md`
- Insert new sections without breaking existing prompt structure
- Use clear, imperative language
- Keep additions concise to avoid overly lengthy prompts

## Input Dependencies
None - this is the first task

## Output Artifacts
- Updated create-plan.md file with scope control sections

## Implementation Notes
Add the new sections after the existing Important Notes section but before the closing. Focus on:
- YAGNI principle
- Minimal viable implementation
- Warning against "nice to have" additions
- Examples of what NOT to add