---
id: 4
group: "hook-creation"
dependencies: []
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Create PRE_TASK_ASSIGNMENT Hook

## Objective
Create the PRE_TASK_ASSIGNMENT.md hook file by copying exact task skill analysis and agent selection logic from execute-blueprint.md and execute-task.md without any modifications.

## Skills Required
- text-manipulation: For extracting and copying specific line ranges from command files
- markdown: For creating the hook file with proper formatting

## Acceptance Criteria
- [ ] PRE_TASK_ASSIGNMENT.md hook file is created in `/workspace/templates/ai-task-manager/config/hooks/`
- [ ] File contains exact copy of agent selection logic from execute-blueprint.md lines 63-106
- [ ] File contains exact copy of skills extraction logic from execute-task.md lines 149-191
- [ ] No modifications are made to the copied code sections
- [ ] Hook file follows the same format as existing hook files

## Technical Requirements
- Copy lines 63-106 from `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Copy lines 149-191 from `/workspace/templates/assistant/commands/tasks/execute-task.md`
- Create hook file at `/workspace/templates/ai-task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md`
- Preserve all bash scripts, skill extraction logic, and agent matching criteria exactly

## Input Dependencies
- Existing execute-blueprint.md command file
- Existing execute-task.md command file
- Access to existing hook file examples for format reference

## Output Artifacts
- `/workspace/templates/ai-task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md` hook file containing:
  - Task skill extraction from frontmatter
  - Sub-agent capability matching
  - Agent selection based on technical requirements
  - Resource efficiency considerations
  - Skills extraction logic from task frontmatter
  - Available sub-agent detection across assistant directories
  - General-purpose agent fallback logic

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Read the source files**:
   - Open `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
   - Locate lines 63-106 (agent selection and task assignment section)
   - Open `/workspace/templates/assistant/commands/tasks/execute-task.md`
   - Locate lines 149-191 (skills extraction and agent selection section)

2. **Extract the content**:
   - Copy lines 63-106 from execute-blueprint.md exactly as they appear
   - Copy lines 149-191 from execute-task.md exactly as they appear
   - Do not modify any text, bash commands, or agent selection logic

3. **Create the hook file**:
   - Create `/workspace/templates/ai-task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md`
   - Structure the content logically with clear section headers
   - Combine both agent selection sections into one cohesive hook file
   - Follow the format pattern of existing hooks like POST_PHASE.md

4. **Content organization**:
   - Add a brief header explaining the hook's purpose
   - Section 1: Agent selection and matching criteria (from execute-blueprint.md)
   - Section 2: Skills extraction and agent detection (from execute-task.md)
   - Preserve all bash scripts and agent selection algorithms

5. **Validation**:
   - Ensure all bash commands for skill extraction are preserved exactly
   - Verify agent matching criteria and logic are maintained
   - Confirm AWK scripts and pattern matching are identical
   - Check that directory scanning and fallback logic are unchanged
   - Ensure temporary file handling and variable assignments are preserved

</details>