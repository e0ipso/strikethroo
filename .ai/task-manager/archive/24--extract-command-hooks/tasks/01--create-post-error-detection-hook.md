---
id: 1
group: "hook-creation"
dependencies: []
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Create POST_ERROR_DETECTION Hook

## Objective
Create the POST_ERROR_DETECTION.md hook file by copying exact error handling logic from execute-task.md and execute-blueprint.md without any modifications.

## Skills Required
- text-manipulation: For extracting and copying specific line ranges from command files
- markdown: For creating the hook file with proper formatting

## Acceptance Criteria
- [ ] POST_ERROR_DETECTION.md hook file is created in `/workspace/templates/ai-task-manager/config/hooks/`
- [ ] File contains exact copy of error handling logic from execute-task.md lines 272-304
- [ ] File contains exact copy of validation gate failure handling from execute-blueprint.md lines 126-133
- [ ] No modifications are made to the copied code sections
- [ ] Hook file follows the same format as existing hook files

## Technical Requirements
- Copy lines 272-304 from `/workspace/templates/assistant/commands/tasks/execute-task.md`
- Copy lines 126-133 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Create hook file at `/workspace/templates/ai-task-manager/config/hooks/POST_ERROR_DETECTION.md`
- Preserve all bash scripts, variable references, and procedural instructions exactly

## Input Dependencies
- Existing execute-task.md command file
- Existing execute-blueprint.md command file
- Access to existing hook file examples for format reference

## Output Artifacts
- `/workspace/templates/ai-task-manager/config/hooks/POST_ERROR_DETECTION.md` hook file containing:
  - Error status management logic
  - Failed task documentation and recovery guidance
  - Status update procedures with proper file handling
  - Validation gate failure handling
  - Remediation plan generation logic
  - Error escalation procedures

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Read the source files**:
   - Open `/workspace/templates/assistant/commands/tasks/execute-task.md`
   - Locate lines 272-304 (error handling section)
   - Open `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
   - Locate lines 126-133 (validation gate failure section)

2. **Extract the content**:
   - Copy lines 272-304 from execute-task.md exactly as they appear
   - Copy lines 126-133 from execute-blueprint.md exactly as they appear
   - Do not modify any text, bash commands, variable names, or logic

3. **Create the hook file**:
   - Create `/workspace/templates/ai-task-manager/config/hooks/POST_ERROR_DETECTION.md`
   - Structure the content logically with clear section headers
   - Combine both error handling sections into one cohesive hook file
   - Follow the format pattern of existing hooks like POST_PHASE.md

4. **Content organization**:
   - Add a brief header explaining the hook's purpose
   - Section 1: Task execution error handling (from execute-task.md)
   - Section 2: Validation gate failure handling (from execute-blueprint.md)
   - Preserve all bash scripts, error messages, and procedural steps

5. **Validation**:
   - Ensure all bash commands are preserved exactly
   - Verify all variable references are maintained
   - Confirm file paths and command syntax are identical
   - Check that no functionality is lost or changed

</details>