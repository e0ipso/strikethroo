---
id: 5
group: "template-processing"
dependencies: [4]
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Integrate Open Code Template Processing

## Objective
Ensure the template processing pipeline correctly handles Open Code templates, copying Markdown templates to `.opencode/command/tasks/` without format conversion.

## Skills Required
- **typescript**: Integrate Open Code into existing template processing workflow

## Acceptance Criteria
- [ ] Template processing recognizes Open Code as requiring Markdown format
- [ ] Templates are copied to `.opencode/command/tasks/` directory
- [ ] Variable substitution (`$ARGUMENTS`, etc.) works correctly for Open Code
- [ ] Open Code-specific frontmatter options (agent, model) are preserved
- [ ] No template format conversion applied (unlike Gemini's TOML conversion)

## Technical Requirements
- Verify template processing pipeline handles Open Code assistant type
- Ensure templates are copied to correct Open Code directory structure
- Confirm variable substitution patterns work for Open Code templates
- Test frontmatter preservation for Open Code-specific options
- Validate template content remains in Markdown format

## Input Dependencies
- Task 4: Open Code directory structure must be created first

## Output Artifacts
- Template processing pipeline that supports Open Code
- Correctly processed Open Code templates in expected directory structure

## Implementation Notes
Since Open Code uses Markdown format like Claude, minimal changes should be needed. The main verification is ensuring the template processing correctly identifies Open Code's directory structure (`.opencode/command/tasks/`) and copies templates there without applying TOML conversion.