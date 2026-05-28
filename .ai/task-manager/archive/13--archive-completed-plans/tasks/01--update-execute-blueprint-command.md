---
id: 1
group: "command-templates"
dependencies: []
status: "completed"
created: "2025-09-04"
---

## Objective

Update the execute-blueprint.md command template to add post-execution functionality that appends an execution summary to the plan document and moves successfully completed plans to an archive directory.

## Acceptance Criteria

- [ ] Execute-blueprint.md includes post-execution summary section generation
- [ ] Plan document receives execution summary appended after successful completion
- [ ] Archive directory is created if it doesn't exist
- [ ] Completed plan folders are moved from `.ai/task-manager/plans/` to `.ai/task-manager/archive/`
- [ ] Archive operation only occurs on successful execution (all phases completed and validated)
- [ ] Failed executions remain in plans directory for debugging
- [ ] Execution summary includes brief results and noteworthy events when applicable

## Technical Requirements

**File to modify**: `.claude/commands/tasks/execute-blueprint.md` (and `.gemini/commands/tasks/execute-blueprint.toml`)

**Post-execution functionality to add:**
1. **Execution Summary Section**: Append markdown section to plan document with:
   - Clear completion indicator
   - Brief execution results summary
   - Highlighting of unexpected events (when applicable)

2. **Archive Functionality**:
   - Create `.ai/task-manager/archive/` directory if needed
   - Move entire plan folder from `plans/` to `archive/`
   - Only trigger on successful execution completion

**Integration point**: Add these steps at the very end of the execution workflow, after the "Final Execution Report" section.

## Input Dependencies

- Existing execute-blueprint.md command template
- Understanding of current execution flow and validation gates

## Output Artifacts

- Updated execute-blueprint.md with post-execution functionality
- Updated execute-blueprint.toml (Gemini version) with same functionality

## Implementation Notes

- Ensure archive operations include proper error handling
- Maintain backward compatibility with existing execution flow
- Add archive directory creation as a safe operation (create if not exists)
- Use file system move operations (not copy) to relocate plan folders