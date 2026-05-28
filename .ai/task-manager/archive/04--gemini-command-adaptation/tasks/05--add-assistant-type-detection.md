---
id: 5
group: "init-command-updates"
dependencies: [2, 3, 4]
status: "completed"
created: "2025-09-01"
---

## Objective
Add logic to the init command to detect assistant type and determine whether to generate MD or TOML format command files.

## Acceptance Criteria
- [ ] Modify init command to identify when Gemini is selected as assistant
- [ ] Add conditional logic for template format selection (MD vs TOML)
- [ ] Ensure Claude initialization path remains unchanged
- [ ] Update assistant validation to handle both format types
- [ ] Test both Claude and Gemini initialization paths

## Technical Requirements
- Modify `src/index.ts` init function to detect assistant type
- Add template format selection logic in `createAssistantStructure`
- Update file extension handling for different assistants
- Preserve existing Claude functionality without changes
- Ensure type safety with TypeScript

## Input Dependencies
- TOML template files from Tasks 02, 03, 04
- Current init command implementation in `src/index.ts`
- Understanding of assistant type handling in existing code

## Output Artifacts
- Updated init command with format detection logic
- Conditional template copying based on assistant type
- Type definitions for template format handling if needed

## Implementation Notes
- Focus on minimal changes to existing Claude workflow
- Add new logic path for Gemini without affecting Claude
- Consider using helper functions for template format selection
- Ensure proper error handling for both assistant types
- Test with both single and multiple assistant selections