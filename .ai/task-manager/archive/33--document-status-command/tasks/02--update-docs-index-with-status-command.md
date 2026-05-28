---
id: 2
group: "documentation"
dependencies: []
status: "completed"
created: "2025-10-16"
skills:
  - "markdown"
  - "technical-writing"
---
# Update docs/index.md with Status Command

## Objective
Add the status command to docs/index.md day-to-day workflow section and usage examples to help users integrate monitoring into their development process.

## Skills Required
- Markdown editing
- Technical writing

## Acceptance Criteria
- [ ] Status command added to day-to-day workflow section
- [ ] Usage example included with command syntax
- [ ] Placement is logical within the workflow
- [ ] Formatting consistent with existing documentation

## Technical Requirements
Update `/workspace/docs/index.md` to include the status command in two locations:

1. **Day-to-Day Workflow Section**: Add as a step users can use to check progress
2. **Usage Examples Section**: Add command syntax example

The command syntax is:
```bash
npx @e0ipso/ai-task-manager status
```

## Input Dependencies
None - standalone documentation update

## Output Artifacts
- Updated docs/index.md with status command references

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Location 1: Day-to-Day Workflow
Find the workflow steps section (currently 8 numbered steps) and add a reference to the status command. Suggest using it before or after executing blueprints to check progress.

Example placement:
```markdown
5. Check your progress anytime with `npx @e0ipso/ai-task-manager status`
```

### Location 2: Usage Examples
Add to the usage examples section:

```markdown
### Check Progress

Display a dashboard showing plan and task statistics:

\`\`\`bash
npx @e0ipso/ai-task-manager status
\`\`\`

This shows:
- Summary statistics (total plans, active/archived counts)
- Active plans with progress bars
- Unfinished tasks in archived plans
- Archived plans list
```

### Style Consistency
- Use backticks for command syntax
- Keep descriptions concise (1-2 sentences)
- Follow existing section structure
- Use bullet points for feature lists

</details>
