---
id: 1
group: "readme-template"
dependencies: []
status: "completed"
created: 2025-10-16
skills:
  - markdown
---
# Create README Template

## Objective
Create a concise README.md template at `templates/ai-task-manager/README.md` that explains the `.ai/task-manager/` directory's purpose and provides links to project resources.

## Skills Required
- **markdown**: Creating clear, concise markdown documentation

## Acceptance Criteria
- [ ] README.md file exists at `templates/ai-task-manager/README.md`
- [ ] Content is concise (3-5 lines of text maximum)
- [ ] Includes brief description of directory purpose (AI-assisted task management)
- [ ] States it's managed by AI Task Manager project
- [ ] Contains link to GitHub repository: https://www.github.com/e0ipso/ai-task-manager
- [ ] Contains link to documentation: https://mateuaguilo.com/ai-task-manager
- [ ] Uses proper markdown formatting

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- File location: `templates/ai-task-manager/README.md`
- Format: Standard markdown
- Content constraints: Minimal and focused (3-5 lines maximum)
- Must include both repository and documentation links
- Keep language simple and direct

## Input Dependencies
None - this is the first task and has no dependencies.

## Output Artifacts
- `templates/ai-task-manager/README.md` template file

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Content Guidelines
The README should answer one simple question: "What's this folder?"

Keep it extremely concise. Example structure:
```markdown
# AI Task Manager

This directory contains AI-assisted task management files for this project.

Managed by the [AI Task Manager](https://www.github.com/e0ipso/ai-task-manager) project.

**Documentation**: https://mateuaguilo.com/ai-task-manager
```

### Key Principles
- **Brevity**: 3-5 lines of text maximum (excluding blank lines)
- **Clarity**: Use simple, direct language
- **Links**: Ensure both GitHub and documentation URLs are clickable
- **No customization**: This is a static template, no placeholders or variables

### File Creation
1. Create the file at `templates/ai-task-manager/README.md`
2. Write the minimal content following the guidelines above
3. Ensure proper markdown formatting (headers, links)
4. Add a trailing newline at the end of the file (project standard)
5. Verify no trailing spaces (enforced by Prettier)

</details>
