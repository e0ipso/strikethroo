---
id: 1
group: "documentation"
dependencies: []
status: "completed"
created: "2025-10-16"
skills:
  - "markdown"
  - "technical-writing"
---
# Update README.md with Status Command

## Objective
Add the status command to README.md Quick Workflow Preview section to help users discover the monitoring capability.

## Skills Required
- Markdown editing
- Technical writing

## Acceptance Criteria
- [ ] Status command added to Quick Workflow Preview section
- [ ] Follows existing emoji and formatting patterns
- [ ] Addition is concise (1-2 lines maximum)
- [ ] Command syntax is accurate

## Technical Requirements
Update `/workspace/README.md` to include the status command in the workflow section. The command syntax is:
```bash
npx @e0ipso/ai-task-manager status
```

The update should:
- Follow the existing numbered list format with emoji
- Be placed logically in the workflow (after or alongside execute-blueprint)
- Use consistent formatting with other commands

## Input Dependencies
None - standalone documentation update

## Output Artifacts
- Updated README.md with status command reference

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Location
Find the "Quick Workflow Preview" section in README.md and add the status command reference.

### Format Pattern
Follow the existing pattern:
```markdown
N. 🔍 **Check progress**: `npx @e0ipso/ai-task-manager status`
```

### Placement
Insert after step 3 (execute-blueprint) or as a standalone monitoring step that can be used at any point.

### Example Addition
```markdown
4. 🔍 **Monitor progress**: Run `npx @e0ipso/ai-task-manager status` to view dashboard
```

</details>
