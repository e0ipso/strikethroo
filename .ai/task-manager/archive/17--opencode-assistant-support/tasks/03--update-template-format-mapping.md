---
id: 3
group: "template-processing"
dependencies: [1]
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Update Template Format Mapping

## Objective
Update the `getTemplateFormat()` function in `src/utils.ts` to map Open Code to Markdown format, enabling it to use the same template processing as Claude.

## Skills Required
- **typescript**: Modify template format mapping logic

## Acceptance Criteria
- [ ] `getTemplateFormat('opencode')` returns `'md'` (Markdown format)
- [ ] Open Code uses the same template format as Claude (no TOML conversion needed)
- [ ] Template processing pipeline correctly identifies Open Code format requirements
- [ ] No impact on existing Claude (Markdown) or Gemini (TOML) format mappings

## Technical Requirements
- Locate the `getTemplateFormat()` function in `src/utils.ts`
- Add mapping for `'opencode'` assistant to return `'md'` format
- Verify the function handles the new assistant type correctly
- Ensure consistent behavior with Claude's Markdown processing

## Input Dependencies
- Task 1: Updated `Assistant` type definition must be completed first

## Output Artifacts
- Updated `getTemplateFormat()` function that maps Open Code to Markdown
- Proper template format identification for Open Code assistant

## Implementation Notes
Since Open Code uses Markdown format like Claude, this should be a simple addition to the format mapping logic. The function likely contains a switch statement or object mapping that needs to include the `'opencode'` case returning `'md'`.