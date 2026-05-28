---
id: 3
group: "documentation"
dependencies: [1]
status: "completed"
created: "2025-09-01"
---

## Objective
Update the `templates/commands/tasks/create-plan.md` template file with the bash command for automatic plan ID generation, including proper documentation and usage instructions.

## Acceptance Criteria
- [ ] Add new section documenting the plan ID generation bash command
- [ ] Include copy-pasteable command from task 1
- [ ] Explain numeric vs zero-padded string distinction in front-matter
- [ ] Provide usage examples showing command execution
- [ ] Update frontmatter schema documentation if needed
- [ ] Add notes about edge case handling
- [ ] Include instructions for manual fallback if command fails
- [ ] Maintain existing template structure and formatting

## Technical Requirements
- Add bash command documentation section before or after current frontmatter section
- Use proper markdown formatting for code blocks
- Include clear explanations of when and how to use the command
- Document the difference between numeric IDs in front-matter vs zero-padded directory names
- Provide concrete examples of proper usage

## Input Dependencies
- Completed and tested bash command from task 1
- Current `templates/commands/tasks/create-plan.md` file content
- Understanding of template structure and conventions

## Output Artifacts
- Updated `templates/commands/tasks/create-plan.md` with ID generation documentation
- Clear usage instructions for template users
- Examples showing proper front-matter formatting

## Implementation Notes
- Insert new section titled "### Plan ID Generation"
- Include the bash command in a code block with proper syntax highlighting
- Explain that front-matter should use numeric values: `id: 6` not `id: "06"`
- Clarify that directory/file names use zero-padding: `06--plan-name`
- Add example showing: command output → front-matter usage → directory creation
- Consider adding this section near the frontmatter schema documentation