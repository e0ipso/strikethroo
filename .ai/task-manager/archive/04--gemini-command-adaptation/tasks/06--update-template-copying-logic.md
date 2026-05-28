---
id: 6
group: "init-command-updates"
dependencies: [2, 3, 4]
status: "completed"
created: "2025-09-01"
---

## Objective
Update the template copying logic in the init command to handle both MD and TOML formats based on assistant type.

## Acceptance Criteria
- [ ] Modify `createAssistantStructure` to copy appropriate template format
- [ ] Update template file selection logic for Claude (.md) vs Gemini (.toml)
- [ ] Ensure proper file extension handling in destination paths
- [ ] Update error handling for both template formats
- [ ] Test template copying for both assistant types

## Technical Requirements
- Modify template copying in `createAssistantStructure` function
- Update `commandTemplates` array to handle format selection
- Change destination file extensions based on assistant type
- Update template existence validation for both formats
- Maintain existing error handling patterns

## Input Dependencies
- TOML template files from Tasks 02, 03, 04
- Assistant type detection logic from Task 05
- Current template copying implementation

## Output Artifacts
- Updated template copying logic supporting both formats
- Modified file extension handling for different assistants
- Enhanced error messages for template-related issues

## Implementation Notes
- Preserve existing MD template copying for Claude
- Add parallel TOML template copying for Gemini
- Ensure template existence checks work for both formats
- Update logging messages to reflect template format used
- Consider creating helper functions for format-specific operations