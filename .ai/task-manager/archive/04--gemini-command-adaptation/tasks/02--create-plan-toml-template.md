---
id: 2
group: "template-creation"
dependencies: [1]
status: "completed"
created: "2025-09-01"
---

## Objective
Create a Gemini-compatible TOML version of the create-plan.md template with proper argument handling and format conversion.

## Acceptance Criteria
- [ ] Convert markdown frontmatter to TOML format with `description` and `prompt` fields
- [ ] Replace `$ARGUMENTS` placeholder with appropriate Gemini argument handling
- [ ] Preserve all functional content and instructions from original template
- [ ] Ensure TOML syntax is valid and follows Gemini CLI requirements
- [ ] Test argument injection works correctly with Gemini CLI

## Technical Requirements
- Create `templates/commands/tasks/create-plan.toml` file
- Use TOML v1 format specification
- Implement proper argument handling ({{args}} or default behavior)
- Maintain semantic equivalence with original markdown version
- Follow Gemini CLI command structure requirements

## Input Dependencies
- Analysis results from Task 01
- Original `templates/commands/tasks/create-plan.md` file
- Gemini CLI TOML format specification

## Output Artifacts
- `templates/commands/tasks/create-plan.toml` file
- Documentation of conversion choices made
- Test validation of argument handling functionality

## Implementation Notes
- Consider whether to use `{{args}}` shorthand or default argument handling
- Preserve multiline prompt content with proper TOML escaping
- Map `argument-hint` from frontmatter to `description` field
- Ensure all @include references and special instructions are preserved