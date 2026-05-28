---
id: 2
group: "orchestration-refactor"
dependencies: [1]
status: "completed"
created: 2025-11-04
skills:
  - markdown
  - prompt-engineering
---
# Refactor full-workflow.md to Use Prompt Composition

## Objective
Refactor `templates/assistant/commands/tasks/full-workflow.md` to replace SlashCommand tool invocations with runtime prompt composition, enabling uninterrupted execution through all three workflow steps.

## Skills Required
- **markdown**: Editing and structuring markdown command templates
- **prompt-engineering**: Crafting prompts that guide LLMs through multi-step workflows

## Acceptance Criteria
- [ ] Remove all SlashCommand tool invocations from full-workflow.md
- [ ] Add inline composition of create-plan.md, generate-tasks.md, and execute-blueprint.md prompts
- [ ] Include progress indicators (⬛⬜⬜ format) between major sections
- [ ] Maintain existing approval method logic
- [ ] Preserve structured output format for command coordination
- [ ] Test that workflow executes without pausing for user input

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File Location**: `templates/assistant/commands/tasks/full-workflow.md`
- **Composition Approach**: Directly embed the prompts from the three sub-commands inline
- **Progress Indicators**: ASCII progress bars (⬛⬜⬜ 33%, ⬛⬛⬜ 66%, ⬛⬛⬛ 100%)
- **Variable Flow**: User input → Plan ID extraction → Task count tracking
- **Output Format**: Maintain existing structured summary at end

## Input Dependencies
- Task 1: `compose-prompt.cjs` script (though this task uses direct embedding instead)
- Existing `create-plan.md`, `generate-tasks.md`, `execute-blueprint.md` templates
- Current `full-workflow.md` structure and approval method logic

## Output Artifacts
- Modified `templates/assistant/commands/tasks/full-workflow.md`
- Workflow that executes create-plan → generate-tasks → execute-blueprint without interruption

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Approach: Direct Prompt Embedding

Instead of using the compose-prompt.cjs script, embed the prompts directly in the markdown:

```markdown
## Step 1: Plan Creation

Execute the following plan creation process:

[Copy the core instructions from create-plan.md here, excluding frontmatter]
[Substitute $ARGUMENTS with the user's input from the workflow]

**Progress**: ⬛⬜⬜ 33% - Step 1/3: Plan Creation Complete

---

## Step 2: Task Generation

Using the Plan ID extracted from Step 1, execute task generation:

[Copy the core instructions from generate-tasks.md here]
[Substitute $1 with the extracted Plan ID]

**Progress**: ⬛⬛⬜ 66% - Step 2/3: Task Generation Complete

---

## Step 3: Blueprint Execution

Using the Plan ID from previous steps, execute the blueprint:

[Copy the core instructions from execute-blueprint.md here]
[Substitute $1 with the extracted Plan ID]

**Progress**: ⬛⬛⬛ 100% - Step 3/3: Blueprint Execution Complete
```

### Key Instructions to Include

Add explicit guidance in the prompt:
- "Execute all three steps sequentially without waiting for user input between steps"
- "Extract the Plan ID from Step 1's structured output and use it in Steps 2 and 3"
- "Progress indicators are for user visibility only - do not pause execution"

### Variable Handling

Clearly explain context passing:
```markdown
**Context Passing**:
1. User provides prompt → use as $ARGUMENTS in Step 1
2. Step 1 outputs "Plan ID: X" → extract X, use as $1 in Step 2
3. Step 2 outputs "Tasks: Y" → use for progress tracking in Step 3
```

### Approval Method

Keep the existing logic for setting approval methods:
```bash
node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto
```

### Testing

After implementation:
1. Run `/tasks:full-workflow "Test prompt"`
2. Verify it executes all three steps without user intervention
3. Confirm plan is created, tasks generated, and blueprint executed
4. Check that the plan is archived at the end

</details>
