---
id: 1
group: "bash-commands"
dependencies: []
status: "completed"
created: "2025-09-01"
---

## Objective
Develop and test a reliable bash command that automatically generates the next sequential plan ID by analyzing existing plans in the `.ai/task-manager/plans/` directory.

## Acceptance Criteria
- [ ] Bash command returns only numeric ID (e.g., `7`, not `07`)
- [ ] Command handles empty plans directory (returns `1`)
- [ ] Command handles non-sequential existing IDs (returns max + 1)
- [ ] Command works with existing plan folder naming pattern `XX--plan-name`
- [ ] Command is single-line and copy-pasteable
- [ ] Command tested across bash and zsh environments
- [ ] Edge cases documented (no plans, gaps in sequence, malformed names)

## Technical Requirements
- Use standard Unix utilities: `find`, `ls`, `sort`, `tail`, `basename`
- Parse plan folder names with pattern `[0-9][0-9]*--*`
- Extract numeric ID from folder names
- Return highest ID + 1
- Handle edge case when no plans exist (return 1)
- Ensure command works from repository root

## Input Dependencies
- Access to existing `.ai/task-manager/plans/` directory structure
- Understanding of current plan folder naming conventions

## Output Artifacts
- Single-line bash command for plan ID generation
- Test results showing command works for various scenarios
- Documentation of edge cases and expected behavior

## Implementation Notes
- Current plan folders follow pattern: `01--name`, `02--name`, etc.
- Front-matter uses numeric IDs: `id: 1`, `id: 2`, etc.
- Command should extract numeric part from folder names
- Consider using: `ls -d .ai/task-manager/plans/[0-9]*--* | sed 's/.*\/\([0-9]*\)--.*/\1/' | sort -n | tail -1`
- Add 1 to result, handle empty case with default of 1