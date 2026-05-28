---
id: 8
group: "command-modification"
dependencies: [2]
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Update generate-tasks Command File

## Objective
Update the generate-tasks.md command file by removing the relocated code sections and replacing them with appropriate hook references.

## Skills Required
- text-manipulation: For removing specific line ranges and inserting hook references
- markdown: For maintaining proper file formatting and structure

## Acceptance Criteria
- [ ] Lines 351-454 (plan document updating logic) are removed from generate-tasks.md
- [ ] Hook reference to POST_PLAN.md is added where plan updating logic was located
- [ ] No other changes are made to the file
- [ ] File maintains proper markdown formatting

## Technical Requirements
- Remove lines 351-454 from `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
- Add hook reference `/config/hooks/POST_PLAN.md` at appropriate location
- Ensure hook references follow established patterns

## Input Dependencies
- Task 2 must be completed (POST_PLAN.md hook exists)
- Access to existing command file with current code sections

## Output Artifacts
- Updated `/workspace/templates/assistant/commands/tasks/generate-tasks.md` with:
  - Plan document updating logic code section replaced with POST_PLAN hook reference
  - All other content preserved unchanged

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Locate the target section**:
   - Open `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
   - Identify lines 351-454 (plan document updating section to be replaced)

2. **Replace plan updating section**:
   - Remove lines 351-454 completely
   - At the location where the plan updating logic was, add the hook reference:
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
   - Ensure dependency visualization and blueprint creation logic are properly referenced through the hook

</details>