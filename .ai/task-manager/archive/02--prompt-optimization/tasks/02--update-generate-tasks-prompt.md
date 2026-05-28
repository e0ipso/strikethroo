---
id: 2
group: "prompt-updates"
dependencies: []
status: "completed"
created: "2025-09-01"
---

# Task 02: Update generate-tasks.md Prompt

## Objective
Add task minimization constraints and meaningful test strategy guidelines to the generate-tasks.md template to reduce redundant tasks and improve test quality.

## Acceptance Criteria
- [ ] Task minimization section added with constraint to create minimum tasks needed
- [ ] Test strategy section added defining "meaningful tests"
- [ ] Examples of redundant tests to avoid included
- [ ] Guidelines for when NOT to write tests specified
- [ ] Anti-patterns and positive patterns documented
- [ ] Existing prompt functionality preserved

## Technical Requirements
- Edit `/workspace/templates/commands/tasks/generate-tasks.md`
- Insert new sections without breaking existing prompt structure
- Provide concrete examples of what to avoid
- Balance restrictiveness with necessary flexibility

## Input Dependencies
None - can run in parallel with task 01

## Output Artifacts
- Updated generate-tasks.md file with task minimization and test strategy sections

## Implementation Notes
Focus on:
- Minimum viable task sets
- DRY testing principle
- Testing business logic, not frameworks
- Clear examples of redundant test patterns to avoid
- When NOT to create tests (e.g., for third-party libraries)