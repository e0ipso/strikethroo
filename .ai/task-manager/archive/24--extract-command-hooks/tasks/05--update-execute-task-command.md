---
id: 5
group: "command-modification"
dependencies: [1, 4]
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Update execute-task Command File

## Objective
Update the execute-task.md command file by removing the relocated code sections and replacing them with appropriate hook references.

## Skills Required
- text-manipulation: For removing specific line ranges and inserting hook references
- markdown: For maintaining proper file formatting and structure

## Acceptance Criteria
- [ ] Lines 272-304 (error handling logic) are removed from execute-task.md
- [ ] Lines 149-191 (skills extraction logic) are removed from execute-task.md
- [ ] Hook reference to POST_ERROR_DETECTION.md is added where error handling was located
- [ ] Hook reference to PRE_TASK_ASSIGNMENT.md is added where skills extraction was located
- [ ] No other changes are made to the file
- [ ] File maintains proper markdown formatting

## Technical Requirements
- Remove lines 272-304 from `/workspace/templates/assistant/commands/tasks/execute-task.md`
- Remove lines 149-191 from `/workspace/templates/assistant/commands/tasks/execute-task.md`
- Add hook reference `/config/hooks/POST_ERROR_DETECTION.md` at appropriate location
- Add hook reference `/config/hooks/PRE_TASK_ASSIGNMENT.md` at appropriate location
- Ensure hook references follow established patterns

## Input Dependencies
- Task 1 must be completed (POST_ERROR_DETECTION.md hook exists)
- Task 4 must be completed (PRE_TASK_ASSIGNMENT.md hook exists)
- Access to existing command file with current code sections

## Output Artifacts
- Updated `/workspace/templates/assistant/commands/tasks/execute-task.md` with:
  - Error handling code section replaced with POST_ERROR_DETECTION hook reference
  - Skills extraction code section replaced with PRE_TASK_ASSIGNMENT hook reference
  - All other content preserved unchanged

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Locate the target sections**:
   - Open `/workspace/templates/assistant/commands/tasks/execute-task.md`
   - Identify lines 272-304 (error handling section to be replaced)
   - Identify lines 149-191 (skills extraction section to be replaced)

2. **Replace error handling section**:
   - Remove lines 272-304 completely
   - At the location where the error handling was, add the hook reference:
     ```
     Read and execute /config/hooks/POST_ERROR_DETECTION.md
     ```

3. **Replace skills extraction section**:
   - Remove lines 149-191 completely
   - At the location where the skills extraction was, add the hook reference:
     ```
     Read and execute /config/hooks/PRE_TASK_ASSIGNMENT.md
     ```

4. **Verify hook reference format**:
   - Ensure hook references follow the same pattern as existing references
   - Check that the syntax matches POST_PHASE.md and POST_TASK_GENERATION_ALL.md usage
   - Maintain consistent indentation and formatting

5. **Validation**:
   - Confirm only the specified line ranges are removed
   - Verify hook references are placed at the correct locations
   - Ensure no other content is modified
   - Check that file structure and formatting are preserved

</details>