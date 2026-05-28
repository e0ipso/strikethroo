---
id: 2
group: "bash-commands"
dependencies: []
status: "completed"
created: "2025-09-01"
---

## Objective
Develop and test a reliable bash command that automatically generates the next sequential task ID within a specific plan by analyzing existing task files in the plan's `tasks/` directory.

## Acceptance Criteria
- [ ] Bash command accepts plan ID as parameter (e.g., plan 06)
- [ ] Command returns only numeric ID (e.g., `3`, not `03`)
- [ ] Command handles empty tasks directory (returns `1`)
- [ ] Command handles non-sequential existing task IDs (returns max + 1)
- [ ] Command works with existing task file naming pattern `XX--task-name.md`
- [ ] Command is single-line and copy-pasteable
- [ ] Command tested across bash and zsh environments
- [ ] Edge cases documented (no tasks, gaps in sequence, malformed names)

## Technical Requirements
- Use standard Unix utilities: `find`, `ls`, `sort`, `tail`, `basename`
- Accept plan ID parameter (numeric, like `6` for plan 06)
- Parse task file names with pattern `[0-9][0-9]*--*.md`
- Extract numeric ID from task filenames
- Return highest task ID + 1 within the specific plan
- Handle edge case when no tasks exist (return 1)
- Ensure command works from repository root

## Input Dependencies
- Access to existing `.ai/task-manager/plans/XX--*/tasks/` directory structure
- Understanding of current task file naming conventions
- Plan ID parameter to specify which plan's tasks to analyze

## Output Artifacts
- Parameterized bash command for task ID generation
- Test results showing command works for various scenarios and different plans
- Documentation of edge cases and expected behavior

## Implementation Notes
- Current task files follow pattern: `01--name.md`, `02--name.md`, etc.
- Front-matter uses numeric IDs: `id: 1`, `id: 2`, etc.
- Command should work for any plan directory (e.g., `06--fix-id-generation-system`)
- Consider using: `ls .ai/task-manager/plans/$(printf "%02d" $PLAN_ID)--*/tasks/[0-9]*--*.md 2>/dev/null | sed 's/.*\/\([0-9]*\)--.*/\1/' | sort -n | tail -1`
- Add 1 to result, handle empty case with default of 1
- Format plan ID parameter with zero-padding for directory lookup