---
id: 2
group: "template-copying"
dependencies: [1]
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Task 002: Update copyCommonTemplates Function

## Objective
Refactor the `copyCommonTemplates` function in `src/index.ts` to use the new recursive copy utility for copying all files from `templates/ai-task-manager/` to `.ai/task-manager/`.

## Skills Required
TypeScript implementation

## Acceptance Criteria
- [ ] Remove hardcoded file list from `copyCommonTemplates`
- [ ] Use `copyDirectoryRecursive` to copy entire `ai-task-manager` directory
- [ ] Ensure all nested directories (config/, config/hooks/, config/templates/) are created
- [ ] Success messages updated to reflect new structure
- [ ] Error handling maintained for missing templates

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
- Import the new `copyDirectoryRecursive` function from utils
- Replace the current templates array with a single recursive copy operation
- Source: `getTemplatePath('ai-task-manager')`
- Destination: `resolvePath(baseDir, '.ai/task-manager')`
- Keep existing error handling patterns

## Input Dependencies
- `copyDirectoryRecursive` function from Task 001

## Output Artifacts
- Updated `copyCommonTemplates` function that copies all task manager templates

## Implementation Notes
Current function copies only two files with hardcoded paths. The new implementation should:
1. Remove the templates array
2. Call `copyDirectoryRecursive` once for the entire directory
3. Update logging to show directory copy instead of individual files
4. Maintain backward compatibility with the function signature