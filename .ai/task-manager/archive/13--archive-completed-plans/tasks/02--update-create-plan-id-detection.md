---
id: 2
group: "command-templates"
dependencies: []
status: "completed"
created: "2025-09-04"
---

## Objective

Update the create-plan.md command template to modify plan ID detection logic to scan both active plans and archived plans, ensuring unique IDs across all plans while maintaining separation between active and completed work.

## Acceptance Criteria

- [ ] Create-plan.md searches both `.ai/task-manager/plans/` and `.ai/task-manager/archive/` for ID generation
- [ ] Updated bash command correctly finds highest plan ID across both directories
- [ ] New plans receive unique IDs that don't conflict with archived plans
- [ ] Generate-tasks.md and execute-blueprint.md continue to ignore archived plans
- [ ] Command handles edge cases (empty directories, non-sequential IDs)

## Technical Requirements

**Files to modify**:
- `.claude/commands/tasks/create-plan.md`
- `.gemini/commands/tasks/create-plan.toml`

**Updated bash command for ID detection**:
```bash
echo $(($(find .ai/task-manager/{plans,archive} -name "plan-*.md" -exec grep "^id:" {} \; 2>/dev/null | sed 's/id: *//' | sort -n | tail -1 | sed 's/^$/0/') + 1))
```

**Key changes**:
- Modify the `find` command to search `{plans,archive}` directories
- Add `2>/dev/null` for graceful handling when archive doesn't exist
- Ensure other commands (generate-tasks, execute-blueprint) maintain existing behavior of only searching plans directory

## Input Dependencies

- Existing create-plan.md command template
- Understanding of current ID generation logic

## Output Artifacts

- Updated create-plan.md with dual-directory ID scanning
- Updated create-plan.toml (Gemini version) with same functionality

## Implementation Notes

- The `{plans,archive}` syntax expands to both directories in a single find command
- Error handling with `2>/dev/null` prevents failures when archive directory doesn't exist
- Maintains backward compatibility - works whether archive exists or not
- Other commands explicitly maintain single-directory search behavior