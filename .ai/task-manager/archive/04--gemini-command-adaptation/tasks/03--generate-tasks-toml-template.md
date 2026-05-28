---
id: 3
group: "template-creation"
dependencies: [1]
status: "completed"
created: "2025-09-01"
---

## Objective
Create a Gemini-compatible TOML version of the generate-tasks.md template, handling the `$1` plan ID parameter conversion.

## Acceptance Criteria
- [ ] Convert markdown template to TOML format with proper structure
- [ ] Replace `$1` plan ID parameter with Gemini-compatible argument handling
- [ ] Preserve all task creation guidelines and instructions
- [ ] Maintain complex content structure including examples and anti-patterns
- [ ] Validate TOML syntax and Gemini CLI compatibility

## Technical Requirements
- Create `templates/commands/tasks/generate-tasks.toml` file
- Handle plan ID parameter (`$1`) conversion appropriately
- Preserve extensive prompt content with proper TOML formatting
- Maintain all task minimization principles and validation requirements
- Ensure argument hint maps correctly to description field

## Input Dependencies
- Analysis results from Task 01
- Original `templates/commands/tasks/generate-tasks.md` file
- Understanding of plan ID parameter usage patterns

## Output Artifacts
- `templates/commands/tasks/generate-tasks.toml` file
- Validation of plan ID argument handling
- Documentation of complex content conversion approach

## Implementation Notes
- This template has the most complex content structure
- Pay attention to multi-line string handling in TOML
- Ensure plan ID parameter handling works with Gemini CLI
- Consider using default argument handling due to complexity
- Preserve all code examples and formatting within the prompt