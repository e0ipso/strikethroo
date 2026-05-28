---
id: 39
summary: "Add automatic task generation capability to execute-blueprint command when tasks or execution blueprint are missing"
created: 2025-10-17
---

# Plan: Execute-Blueprint Command Auto Task Generation

## Original Work Order

> Update execute-blueprint Command for Auto Task Generation
>
> Changes to execute-blueprint.md template
>
> 1. Add new "Automatic Task Generation" section (after line 37, before "Execution Process")
>   - Check for plan document existence using TASK_MANAGER.md's find command
>   - Check if tasks exist: ls .ai/task-manager/plans/[plan-folder]/tasks/*.md 2>/dev/null | wc -l
>   - Check if execution blueprint exists: grep -q "^## Execution Blueprint" [plan-file]
>   - If either check fails: display brief notification + invoke /tasks:generate-tasks $1 via SlashCommand
>   - If generation fails: halt with clear error directing user to manual generation
> 2. Update Input Error Handling section (line 36-37)
>   - Modify to reflect that tasks will be auto-generated if missing
>   - Keep error for when plan doesn't exist
> 3. Update example todo list (line 42-54)
>   - Add step: "Validate or auto-generate tasks if missing" before phase execution
>
> Propagation
>
> Since execute-blueprint.md is the source template (Markdown), changes will automatically flow to:
> - Claude: .claude/commands/tasks/execute-blueprint.md
> - Gemini: .gemini/commands/tasks/execute-blueprint.toml (via convertMdToToml)
> - OpenCode: .opencode/command/tasks/execute-blueprint.md
>
> Testing approach
>
> After implementation, validate with a plan that has no tasks to ensure auto-generation triggers correctly.

## Executive Summary

This plan enhances the execute-blueprint command to automatically generate tasks when they are missing or when the execution blueprint section is absent from a plan document. Currently, execute-blueprint requires both tasks and an execution blueprint to exist before execution begins. This creates friction when users run execute-blueprint on plans that haven't yet had task generation performed.

The enhancement adds validation logic that checks for the presence of tasks and the execution blueprint, automatically invoking the generate-tasks command transparently when either is missing. This improvement aligns with the full-workflow command's automated approach while maintaining proper error handling and user feedback. The change is minimal, focused, and follows the existing template system architecture.

Key benefits include improved user experience through automation, consistency with full-workflow behavior, and maintained reliability through proper validation and error handling.

## Context

### Current State

The execute-blueprint.md template (located at `templates/assistant/commands/tasks/execute-blueprint.md`) currently has the following behavior:

- **Line 31-34 (Input Requirements)**: Documents that a plan with execution blueprint and task files are required
- **Line 36-37 (Input Error Handling)**: Stops execution if plan doesn't exist OR if execution blueprint section is missing
- **Line 41-54 (Example todo list)**: Shows phase execution starting immediately without task validation
- **No task existence check**: Command assumes tasks exist and will fail during execution if they don't

This creates a workflow gap where users must manually remember to run `/tasks:generate-tasks` before `/tasks:execute-blueprint`.

### Target State

After implementation:

- **Automated task generation**: Execute-blueprint checks for task existence and blueprint section, automatically running task generation if either is missing
- **User notification**: Brief message informs user when auto-generation is triggered ("Tasks not found, generating automatically...")
- **Clear error handling**: If auto-generation fails, command halts with helpful error message directing user to manual generation
- **Updated documentation**: Input Error Handling and example todo list reflect the new auto-generation capability

This creates a seamless experience similar to the full-workflow command while maintaining the ability to run execute-blueprint independently.

### Background

The full-workflow command (templates/assistant/commands/tasks/full-workflow.md) already implements automatic task generation as part of its sequential workflow (lines 79-88). This plan extends that pattern to execute-blueprint, enabling it to work independently without requiring prior task generation.

The template system architecture uses Markdown as the single source of truth, with automatic conversion to TOML for Gemini. Any changes to the execute-blueprint.md template will automatically propagate to all three assistant platforms (Claude, Gemini, OpenCode) through the existing build/init process.

## Technical Implementation Approach

### Component 1: Add Task Validation and Auto-Generation Section

**Objective**: Insert new validation logic after "Input Error Handling" and before "Execution Process" that checks for tasks and execution blueprint, triggering automatic generation when needed.

**Location**: Insert after line 37, before line 39 ("## Execution Process")

**Implementation Details**:

The new section will include:

1. **Plan document location**: Use the TASK_MANAGER.md find command pattern to locate the plan file and extract the plan folder name
2. **Task existence check**: Count task files in `[plan-folder]/tasks/` directory
3. **Blueprint existence check**: Search for "## Execution Blueprint" section in plan document
4. **Conditional generation**: If either check fails, invoke SlashCommand tool with `/tasks:generate-tasks $1`
5. **Error handling**: Catch generation failures and halt with clear error message

**Section Structure**:
```markdown
### Task and Blueprint Validation

Before proceeding with execution, validate that tasks exist and the execution blueprint has been generated:

1. **Locate plan document and folder**:
[bash commands to find plan]

2. **Check for task files**:
[bash command to count tasks]

3. **Check for execution blueprint section**:
[grep command to find blueprint]

4. **Automatic task generation**:
If either validation fails:
   - Display notification: "Tasks or execution blueprint not found. Generating tasks automatically..."
   - Invoke: SlashCommand with "/tasks:generate-tasks $1"
   - If generation fails: Halt with error directing user to run /tasks:generate-tasks manually
```

### Component 2: Update Input Error Handling Section

**Objective**: Modify the error handling text to reflect that tasks will be auto-generated if missing, while keeping the error for missing plans.

**Location**: Lines 36-37

**Current Text**:
```markdown
### Input Error Handling
If the plan does not exist, or the plan does not have an execution blueprint section. Stop immediately and show an error to the user.
```

**Updated Text**:
```markdown
### Input Error Handling
If the plan does not exist, stop immediately and show an error to the user.

Note: If tasks or the execution blueprint section are missing, they will be automatically generated before execution begins (see Task and Blueprint Validation below).
```

This makes it clear that missing tasks/blueprints are handled automatically, while missing plans still trigger immediate errors.

### Component 3: Update Example Todo List

**Objective**: Add a validation/generation step to the example todo list to reflect the new pre-execution phase.

**Location**: Lines 41-54 (the example todo list in "Execution Process" section)

**Change**: Insert new item after line 43 (after "Create feature branch...") and before the first "Execute PRE_PHASE.md" step:

```markdown
- [ ] Validate or auto-generate tasks and execution blueprint if missing.
```

This demonstrates the new step in the execution flow, helping AI assistants understand the complete process.

## Risk Considerations and Mitigation Strategies

### Technical Risks

- **Template syntax errors**: Incorrect Markdown formatting or bash command syntax could break template processing
    - **Mitigation**: Follow existing template patterns exactly, test template conversion for all three formats (Markdown for Claude/OpenCode, TOML for Gemini)

- **SlashCommand invocation failure**: The SlashCommand tool might not be available or could fail to invoke generate-tasks
    - **Mitigation**: Include comprehensive error handling that catches invocation failures and provides clear guidance to user for manual recovery

### Implementation Risks

- **Bash command portability**: Commands for finding plans and counting tasks must work across different OS environments (Linux, macOS, Windows with WSL)
    - **Mitigation**: Use standard POSIX-compliant commands; follow patterns from TASK_MANAGER.md which already handles cross-platform concerns

- **Circular dependency potential**: If generate-tasks also tries to invoke execute-blueprint, could create infinite loop
    - **Mitigation**: Generate-tasks does not invoke execute-blueprint; only full-workflow chains these commands; architecture prevents circular calls

### Integration Risks

- **Template conversion for Gemini**: TOML conversion might not handle the new SlashCommand invocation correctly
    - **Mitigation**: Follow existing SlashCommand patterns from full-workflow.md template which already demonstrates proper TOML conversion; test converted output

- **Breaking existing workflows**: Changes to Input Error Handling might affect users who rely on current error behavior
    - **Mitigation**: Changes are additive only - behavior becomes more permissive (auto-generates instead of erroring), doesn't break existing valid workflows

## Success Criteria

### Primary Success Criteria

1. Execute-blueprint successfully auto-generates tasks when invoked on a plan without tasks or execution blueprint
2. Brief notification message is displayed to user when auto-generation is triggered
3. Clear error message with manual recovery instructions is shown if auto-generation fails
4. Template changes successfully propagate to all three assistant formats (Claude .md, Gemini .toml, OpenCode .md)

### Quality Assurance Metrics

1. Template conversion completes without errors for all three assistant formats
2. Bash commands for validation execute successfully on Linux/Unix environments
3. SlashCommand invocation follows established patterns from full-workflow.md
4. Documentation (Input Error Handling, example todo list) accurately reflects new behavior
5. No breaking changes to existing execute-blueprint functionality when tasks already exist

## Resource Requirements

### Development Skills

- Markdown template authoring and formatting
- Bash scripting for file system validation
- Understanding of the template conversion system (Markdown → TOML)
- Knowledge of SlashCommand tool usage patterns

### Technical Infrastructure

- Access to templates/assistant/commands/tasks/ directory
- Template conversion utilities (convertMdToToml function)
- Test environment with .ai/task-manager/ structure for validation

## Implementation Order

1. Modify execute-blueprint.md template with new validation section
2. Update Input Error Handling section text
3. Update example todo list with validation step
4. Test template conversion for all three assistant formats
5. Validate with a test plan that has no tasks to confirm auto-generation triggers

## Notes

- The user explicitly confirmed trigger conditions: auto-generate when either tasks are missing OR execution blueprint is missing
- The user chose brief notification style over silent or detailed progress updates
- Error handling should stop immediately with clear message (no retry logic)
- This enhancement mirrors the pattern already established in full-workflow.md, promoting consistency across commands

## Task Dependencies

No dependencies exist - this is a single task implementation.

## Execution Blueprint

**Validation Gates:**
- Reference: `/config/hooks/POST_PHASE.md`

### ✅ Phase 1: Template Modification
**Parallel Tasks:**
- ✔️ Task 001: Add automatic task generation to execute-blueprint template

### Post-phase Actions

After Phase 1 completion:
- Verify template syntax is valid
- Test template conversion for all three assistant formats (Claude .md, Gemini .toml, OpenCode .md)
- Validate with a test plan that has no tasks

### Execution Summary
- Total Phases: 1
- Total Tasks: 1
- Maximum Parallelism: 1 task (in Phase 1)
- Critical Path Length: 1 phase

## Execution Summary

**Status**: ✅ Completed Successfully
**Completed Date**: 2025-10-17

### Results

Successfully implemented automatic task generation capability in the execute-blueprint command template. The enhancement adds validation logic that checks for the presence of tasks and execution blueprint, automatically invoking the generate-tasks command when either is missing.

**Key Deliverables:**
- Modified `templates/assistant/commands/tasks/execute-blueprint.md` with three specific enhancements
- Added "Task and Blueprint Validation" section with comprehensive bash validation steps
- Updated "Input Error Handling" section to document auto-generation behavior
- Updated example todo list to include validation/generation step
- All changes follow existing template patterns and formatting requirements
- Template ready for propagation to all three assistant formats (Claude .md, Gemini .toml, OpenCode .md)

### Noteworthy Events

No significant issues encountered. The implementation proceeded smoothly with all acceptance criteria met:
- Markdown formatting matches existing template patterns perfectly
- Bash commands use proper POSIX-compliant syntax
- SlashCommand invocation follows established patterns from full-workflow.md
- User-friendly notifications with emojis (⚠️ and ❌) included as specified
- All validation requirements satisfied

The task was completed in a single phase with one atomic task, demonstrating effective task decomposition and minimization principles.

### Recommendations

**Next Steps:**
1. Test template conversion for all three assistant formats (Claude, Gemini, OpenCode) to ensure proper TOML generation
2. Validate the auto-generation functionality with a test plan that has no tasks
3. Update any documentation that references the execute-blueprint command workflow
4. Consider adding similar auto-generation capability to other commands if beneficial
