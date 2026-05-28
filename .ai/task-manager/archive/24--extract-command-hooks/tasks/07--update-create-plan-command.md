---
id: 7
group: "command-modification"
dependencies: [2]
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Update create-plan Command File

## Objective
Update the create-plan.md command file by removing the relocated code sections and replacing them with appropriate hook references.

## Skills Required
- text-manipulation: For removing specific line ranges and inserting hook references
- markdown: For maintaining proper file formatting and structure

## Acceptance Criteria
- [ ] Lines 32-57 (context analysis validation) are removed from create-plan.md
- [ ] Hook reference to POST_PLAN.md is added where context analysis was located
- [ ] No other changes are made to the file
- [ ] File maintains proper markdown formatting

## Technical Requirements
- Remove lines 32-57 from `/workspace/templates/assistant/commands/tasks/create-plan.md`
- Add hook reference `/config/hooks/POST_PLAN.md` at appropriate location
- Ensure hook references follow established patterns

## Input Dependencies
- Task 2 must be completed (POST_PLAN.md hook exists)
- Access to existing command file with current code sections

## Output Artifacts
- Updated `/workspace/templates/assistant/commands/tasks/create-plan.md` with:
  - Context analysis validation code section replaced with POST_PLAN hook reference
  - All other content preserved unchanged

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Locate the target section**:
   - Open `/workspace/templates/assistant/commands/tasks/create-plan.md`
   - Identify lines 32-57 (context analysis validation section to be replaced)

2. **Replace context analysis section**:
   - Remove lines 32-57 completely
   - At the location where the context analysis was, add the hook reference:
     ```
     Read and execute /config/hooks/POST_PLAN.md
     ```

3. **Verify hook reference format**:
   - Ensure hook references follow the same pattern as existing references
   - Check that the syntax matches POST_PHASE.md and POST_TASK_GENERATION_ALL.md usage
   - Maintain consistent indentation and formatting

4. **Validation**:
   - Confirm only the specified line range is removed
   - Verify hook reference is placed at the correct location
   - Ensure no other content is modified
   - Check that file structure and formatting are preserved
   - Ensure the clarification phase logic and YAGNI principles are properly referenced through the hook

</details>