---
id: 3
group: "hook-creation"
dependencies: []
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Create PRE_PHASE Hook

## Objective
Create the PRE_PHASE.md hook file by copying exact phase preparation logic from execute-blueprint.md without any modifications.

## Skills Required
- text-manipulation: For extracting and copying specific line ranges from command files
- markdown: For creating the hook file with proper formatting

## Acceptance Criteria
- [ ] PRE_PHASE.md hook file is created in `/workspace/templates/ai-task-manager/config/hooks/`
- [ ] File contains exact copy of phase preparation logic from execute-blueprint.md lines 39-62
- [ ] No modifications are made to the copied code sections
- [ ] Hook file follows the same format as existing hook files

## Technical Requirements
- Copy lines 39-62 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Create hook file at `/workspace/templates/ai-task-manager/config/hooks/PRE_PHASE.md`
- Preserve all bash scripts, git commands, and dependency validation exactly

## Input Dependencies
- Existing execute-blueprint.md command file
- Access to existing hook file examples for format reference

## Output Artifacts
- `/workspace/templates/ai-task-manager/config/hooks/PRE_PHASE.md` hook file containing:
  - Git branch creation and unstaged changes validation
  - Phase initialization and task listing
  - Dependency validation using check-task-dependencies.cjs script
  - Task status verification (no "needs-clarification" tasks)

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Read the source file**:
   - Open `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
   - Locate lines 39-62 (phase pre-execution and initialization section)

2. **Extract the content**:
   - Copy lines 39-62 from execute-blueprint.md exactly as they appear
   - Do not modify any text, bash commands, git commands, or validation logic

3. **Create the hook file**:
   - Create `/workspace/templates/ai-task-manager/config/hooks/PRE_PHASE.md`
   - Structure the content logically with clear section headers
   - Follow the format pattern of existing hooks like POST_PHASE.md

4. **Content organization**:
   - Add a brief header explaining the hook's purpose
   - Preserve the complete phase preparation workflow
   - Maintain all bash script sections exactly as written
   - Keep all git branch logic and dependency checking intact

5. **Validation**:
   - Ensure all bash commands are preserved exactly
   - Verify git commands and branch logic are maintained
   - Confirm dependency checking script references are identical
   - Check that task status validation logic is unchanged
   - Ensure the for loop and error handling are preserved

</details>