---
id: 4
group: "directory-structure"
dependencies: [2, 3]
status: "completed"
created: "2025-09-06"
skills: ["typescript", "filesystem"]
---

# Implement Open Code Directory Creation

## Objective
Extend the `init()` function in `src/index.ts` to create the Open Code directory structure (`.opencode/command/tasks/`) when Open Code is specified as an assistant.

## Skills Required
- **typescript**: Modify the initialization logic and directory creation
- **filesystem**: Implement proper directory structure creation

## Acceptance Criteria
- [ ] `.opencode/` directory is created when `--assistants opencode` is specified
- [ ] `.opencode/command/` subdirectory is created following Open Code conventions
- [ ] `.opencode/command/tasks/` subdirectory is created for task commands
- [ ] Directory creation works with mixed assistants: `--assistants claude,opencode,gemini`
- [ ] Proper error handling if directory creation fails

## Technical Requirements
- Locate the `init()` function in `src/index.ts`
- Add logic to create Open Code directory structure when `'opencode'` is in the assistants list
- Follow the pattern: `.opencode/command/tasks/` (matching Open Code's expected structure)
- Use existing directory creation utilities or file system operations
- Ensure proper error handling and logging

## Input Dependencies
- Task 2: Assistant validation must recognize Open Code
- Task 3: Template format mapping must handle Open Code

## Output Artifacts
- Updated `init()` function that creates Open Code directories
- Proper directory structure for Open Code commands

## Implementation Notes
Look for existing directory creation logic for Claude (`.claude/`) and Gemini (`.gemini/`) directories. The implementation should follow the same pattern but create `.opencode/command/tasks/` instead of `.opencode/commands/tasks/` to match Open Code's expected structure.