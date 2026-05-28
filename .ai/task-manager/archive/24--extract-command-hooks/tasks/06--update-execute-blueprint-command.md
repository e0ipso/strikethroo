---
id: 6
group: "command-modification"
dependencies: [1, 3, 4]
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Update execute-blueprint Command File

## Objective
Update the execute-blueprint.md command file by removing the relocated code sections and replacing them with appropriate hook references.

## Skills Required
- text-manipulation: For removing specific line ranges and inserting hook references
- markdown: For maintaining proper file formatting and structure

## Acceptance Criteria
- [ ] Lines 39-62 (phase preparation logic) are removed from execute-blueprint.md
- [ ] Lines 63-106 (agent selection logic) are removed from execute-blueprint.md
- [ ] Lines 126-133 (validation gate failure handling) are removed from execute-blueprint.md
- [ ] Hook reference to PRE_PHASE.md is added where phase preparation was located
- [ ] Hook reference to PRE_TASK_ASSIGNMENT.md is added where agent selection was located
- [ ] Hook reference to POST_ERROR_DETECTION.md is added where validation failure handling was located
- [ ] No other changes are made to the file
- [ ] File maintains proper markdown formatting

## Technical Requirements
- Remove lines 39-62 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Remove lines 63-106 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Remove lines 126-133 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Add hook reference `/config/hooks/PRE_PHASE.md` at appropriate location
- Add hook reference `/config/hooks/PRE_TASK_ASSIGNMENT.md` at appropriate location
- Add hook reference `/config/hooks/POST_ERROR_DETECTION.md` at appropriate location
- Ensure hook references follow established patterns

## Input Dependencies
- Task 1 must be completed (POST_ERROR_DETECTION.md hook exists)
- Task 3 must be completed (PRE_PHASE.md hook exists)
- Task 4 must be completed (PRE_TASK_ASSIGNMENT.md hook exists)
- Access to existing command file with current code sections

## Output Artifacts
- Updated `/workspace/templates/assistant/commands/tasks/execute-blueprint.md` with:
  - Phase preparation code section replaced with PRE_PHASE hook reference
  - Agent selection code section replaced with PRE_TASK_ASSIGNMENT hook reference
  - Validation failure handling code section replaced with POST_ERROR_DETECTION hook reference
  - All other content preserved unchanged

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Locate the target sections**:
   - Open `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
   - Identify lines 39-62 (phase preparation section to be replaced)
   - Identify lines 63-106 (agent selection section to be replaced)
   - Identify lines 126-133 (validation failure handling section to be replaced)

2. **Replace phase preparation section**:
   - Remove lines 39-62 completely
   - At the location where the phase preparation was, add the hook reference:
     ```
     Read and execute /config/hooks/PRE_PHASE.md
     ```

3. **Replace agent selection section**:
   - Remove lines 63-106 completely
   - At the location where the agent selection was, add the hook reference:
     ```
     Read and execute /config/hooks/PRE_TASK_ASSIGNMENT.md
     ```

4. **Replace validation failure handling section**:
   - Remove lines 126-133 completely
   - At the location where the validation failure handling was, add the hook reference:
     ```
     Read and execute /config/hooks/POST_ERROR_DETECTION.md
     ```

5. **Verify hook reference format**:
   - Ensure hook references follow the same pattern as existing references
   - Check that the syntax matches POST_PHASE.md and POST_TASK_GENERATION_ALL.md usage
   - Maintain consistent indentation and formatting

6. **Validation**:
   - Confirm only the specified line ranges are removed
   - Verify hook references are placed at the correct locations
   - Ensure no other content is modified
   - Check that file structure and formatting are preserved

</details>