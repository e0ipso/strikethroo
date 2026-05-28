---
id: 3
group: "template-copying"
dependencies: [1]
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Task 003: Update Assistant Template Processing

## Objective
Update the `createAssistantStructure` function in `src/index.ts` to copy templates from the new `templates/assistant/` directory and apply format conversions correctly.

## Skills Required
TypeScript implementation

## Acceptance Criteria
- [ ] Update source path from `commands/tasks/` to `assistant/commands/tasks/`
- [ ] Use recursive copy for all assistant files
- [ ] Maintain MD to TOML conversion for Gemini
- [ ] Preserve existing format conversion logic
- [ ] All assistant templates are copied correctly

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
- Update `getMarkdownTemplateNames` call to use `assistant/commands/tasks`
- For Claude: copy files as-is (MD format)
- For Gemini: apply MD to TOML conversion
- Handle the entire `assistant/` directory structure
- Maintain existing `readAndProcessTemplate` logic

## Input Dependencies
- `copyDirectoryRecursive` function from Task 001

## Output Artifacts
- Updated `createAssistantStructure` function that correctly processes assistant templates

## Implementation Notes
The function currently looks for templates in `commands/tasks/` but should:
1. Look in `assistant/commands/tasks/` for template files
2. Consider using recursive copy for non-command files if any exist
3. Keep the format conversion logic intact (MD → TOML for Gemini)
4. Ensure the destination paths remain as `.claude/` or `.gemini/`