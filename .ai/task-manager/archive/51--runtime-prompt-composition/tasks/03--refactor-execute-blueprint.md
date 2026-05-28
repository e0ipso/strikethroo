---
id: 3
group: "orchestration-refactor"
dependencies: [1]
status: "completed"
created: 2025-11-04
skills:
  - markdown
  - bash
---
# Refactor execute-blueprint.md to Use Conditional Prompt Composition

## Objective
Refactor `templates/assistant/commands/tasks/execute-blueprint.md` to replace the recursive SlashCommand invocation with inline prompt composition when tasks are missing.

## Skills Required
- **markdown**: Editing command template structure
- **bash**: Conditional logic for task validation and prompt composition

## Acceptance Criteria
- [ ] Remove SlashCommand invocation for /tasks:generate-tasks
- [ ] Add conditional check for task/blueprint existence
- [ ] Embed generate-tasks.md prompt inline when tasks are missing
- [ ] Maintain existing phase-based execution tracking
- [ ] Preserve approval method logic and structured output
- [ ] Test both scenarios: with existing tasks and with missing tasks

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File Location**: `templates/assistant/commands/tasks/execute-blueprint.md`
- **Conditional Logic**: Check TASK_COUNT and BLUEPRINT_EXISTS from validation script
- **Composition**: Embed generate-tasks.md prompt when needed
- **No Progress Indicators**: Use existing phase-based tracking only
- **Variable Substitution**: Plan ID ($1) passed to embedded generate-tasks prompt

## Input Dependencies
- Task 1: `compose-prompt.cjs` script (though direct embedding may be simpler)
- Existing `execute-blueprint.md` and `generate-tasks.md` templates
- Validation script: `validate-plan-blueprint.cjs`

## Output Artifacts
- Modified `templates/assistant/commands/tasks/execute-blueprint.md`
- Command that auto-generates tasks when missing without interruption

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Conditional Prompt Embedding

Replace the current SlashCommand section (lines 56-71) with:

```markdown
**Automatic task generation**:

If either `$TASK_COUNT` is 0 or `$BLUEPRINT_EXISTS` is "no":
   - Display notification to user: "⚠️ Tasks or execution blueprint not found. Generating tasks automatically..."
   - Set the approval_method_tasks field to auto:
   ```bash
   node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto tasks
   ```
   - Execute the following task generation process inline:

   ## Embedded Task Generation

   [Copy the core instructions from generate-tasks.md here, excluding frontmatter]
   [The plan ID $1 from execute-blueprint becomes the input for this section]

   ## Resume Blueprint Execution

   After task generation completes, continue with the execution process below.

Otherwise, if tasks exist, proceed directly to execution.
```

### Key Changes

1. **Remove**: Lines calling SlashCommand tool
2. **Add**: Conditional embedding of generate-tasks prompt
3. **Preserve**: All existing validation logic, approval method handling, phase execution
4. **Clarify**: "Execute this section only if tasks are missing, then continue"

### Testing Scenarios

**Scenario 1: Missing Tasks**
```bash
# Create a plan without tasks
/tasks:create-plan "Test prompt"
# Run execute-blueprint - should auto-generate tasks inline
/tasks:execute-blueprint 51
```

**Scenario 2: Existing Tasks**
```bash
# Create a plan and generate tasks
/tasks:create-plan "Test prompt"
/tasks:generate-tasks 51
# Run execute-blueprint - should skip generation and execute
/tasks:execute-blueprint 51
```

Both should complete without waiting for user input.

### No Progress Indicators

The plan specifies execute-blueprint should NOT add progress indicators beyond its existing phase tracking. Keep the current phase-based output intact.

</details>
