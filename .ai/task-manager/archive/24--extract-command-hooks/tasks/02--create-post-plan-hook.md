---
id: 2
group: "hook-creation"
dependencies: []
status: "completed"
created: "2025-09-13"
skills: ["text-manipulation", "markdown"]
---

# Create POST_PLAN Hook

## Objective
Create the POST_PLAN.md hook file by copying exact plan validation and updating logic from create-plan.md and generate-tasks.md without any modifications.

## Skills Required
- text-manipulation: For extracting and copying specific line ranges from command files
- markdown: For creating the hook file with proper formatting

## Acceptance Criteria
- [ ] POST_PLAN.md hook file is created in `/workspace/templates/ai-task-manager/config/hooks/`
- [ ] File contains exact copy of context analysis validation from create-plan.md lines 32-57
- [ ] File contains exact copy of plan document updating logic from generate-tasks.md lines 351-454
- [ ] No modifications are made to the copied code sections
- [ ] Hook file follows the same format as existing hook files

## Technical Requirements
- Copy lines 32-57 from `/workspace/templates/assistant/commands/tasks/create-plan.md`
- Copy lines 351-454 from `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
- Create hook file at `/workspace/templates/ai-task-manager/config/hooks/POST_PLAN.md`
- Preserve all clarification logic, validation steps, and Mermaid diagram generation exactly

## Input Dependencies
- Existing create-plan.md command file
- Existing generate-tasks.md command file
- Access to existing hook file examples for format reference

## Output Artifacts
- `/workspace/templates/ai-task-manager/config/hooks/POST_PLAN.md` hook file containing:
  - Context analysis validation (objective, scope, resources, success criteria)
  - Clarification phase logic for missing critical context
  - Plan completeness verification against YAGNI principles
  - Plan document updating with dependency visualization
  - Mermaid diagram generation for task dependencies
  - Phase-based execution blueprint creation

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Read the source files**:
   - Open `/workspace/templates/assistant/commands/tasks/create-plan.md`
   - Locate lines 32-57 (context analysis and clarification phase section)
   - Open `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
   - Locate lines 351-454 (plan document updating section)

2. **Extract the content**:
   - Copy lines 32-57 from create-plan.md exactly as they appear
   - Copy lines 351-454 from generate-tasks.md exactly as they appear
   - Do not modify any text, validation logic, or clarification procedures

3. **Create the hook file**:
   - Create `/workspace/templates/ai-task-manager/config/hooks/POST_PLAN.md`
   - Structure the content logically with clear section headers
   - Combine both plan validation sections into one cohesive hook file
   - Follow the format pattern of existing hooks like POST_PHASE.md

4. **Content organization**:
   - Add a brief header explaining the hook's purpose
   - Section 1: Plan validation and clarification (from create-plan.md)
   - Section 2: Plan document updating and blueprint creation (from generate-tasks.md)
   - Preserve all validation criteria, question templates, and blueprint structures

5. **Validation**:
   - Ensure all clarification questions are preserved exactly
   - Verify all Mermaid diagram syntax is maintained
   - Confirm blueprint structure templates are identical
   - Check that YAGNI validation criteria are unchanged

</details>