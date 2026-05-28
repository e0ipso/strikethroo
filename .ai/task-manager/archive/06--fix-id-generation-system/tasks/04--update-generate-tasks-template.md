---
id: 4
group: "documentation"
dependencies: [2]
status: "completed"
created: "2025-09-01"
---

## Objective
Update the `templates/commands/tasks/generate-tasks.md` template file with the bash command for automatic task ID generation, including proper documentation and usage instructions.

## Acceptance Criteria
- [ ] Add new section documenting the task ID generation bash command
- [ ] Include copy-pasteable parameterized command from task 2
- [ ] Explain how to pass plan ID parameter to the command
- [ ] Explain numeric vs zero-padded string distinction in front-matter
- [ ] Provide usage examples showing command execution with different plan IDs
- [ ] Update frontmatter schema documentation if needed
- [ ] Add notes about edge case handling
- [ ] Include instructions for manual fallback if command fails
- [ ] Maintain existing template structure and formatting

## Technical Requirements
- Add bash command documentation section before or after current frontmatter section
- Use proper markdown formatting for code blocks
- Include clear explanations of when and how to use the parameterized command
- Document the difference between numeric IDs in front-matter vs zero-padded filenames
- Provide concrete examples with different plan IDs (e.g., plan 3, plan 15)
- Show how to extract plan ID from command arguments ($1)

## Input Dependencies
- Completed and tested bash command from task 2
- Current `templates/commands/tasks/generate-tasks.md` file content
- Understanding of template structure and conventions

## Output Artifacts
- Updated `templates/commands/tasks/generate-tasks.md` with ID generation documentation
- Clear usage instructions for template users
- Examples showing proper front-matter formatting and parameter usage

## Implementation Notes
- Insert new section titled "### Task ID Generation"
- Include the parameterized bash command with plan ID parameter
- Explain that front-matter should use numeric values: `id: 3` not `id: "03"`
- Clarify that filenames use zero-padding: `03--task-name.md`
- Add example showing: plan ID input → command execution → front-matter usage → file creation
- Consider adding this section near the frontmatter schema documentation
- Show how the command integrates with the template's $1 argument (plan ID)