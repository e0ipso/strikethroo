---
id: 1
group: "template-modification"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - markdown
---
# Update full-workflow Template to Set Context Flag

## Objective
Modify the full-workflow template to set FULL_WORKFLOW_MODE environment variable before invoking create-plan, enabling context-aware execution.

## Skills Required
- **markdown**: Template file editing and instruction formatting

## Acceptance Criteria
- [ ] FULL_WORKFLOW_MODE=true is set before /tasks:create-plan invocation
- [ ] Documentation added explaining the context flag convention
- [ ] Template maintains all existing functionality
- [ ] Instructions are clear about when to set the flag

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- File: `templates/assistant/commands/tasks/full-workflow.md`
- Modify Step 2 (Execute Plan Creation) section
- Add bash command to set environment variable
- Ensure variable setting precedes SlashCommand invocation

## Input Dependencies
None - this is the first task in the sequence.

## Output Artifacts
- Updated full-workflow.md template with context flag setting
- Documentation of FULL_WORKFLOW_MODE convention

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

**Step 1: Locate the Target Section**
Open `templates/assistant/commands/tasks/full-workflow.md` and find Step 2 (around line 53-66).

**Step 2: Add Environment Variable Setting**
Insert the following BEFORE the SlashCommand invocation:

```markdown
Set full-workflow execution context:
```bash
export FULL_WORKFLOW_MODE=true
```
```

**Step 3: Update Documentation**
Add a note explaining the convention:

```markdown
**Note**: The FULL_WORKFLOW_MODE environment variable signals to subordinate commands (create-plan, generate-tasks, execute-blueprint) that they are running in automated workflow mode and should suppress interactive prompts for plan review.
```

**Step 4: Verify Placement**
Ensure the final structure is:

```markdown
#### Step 2: Execute Plan Creation

Set full-workflow execution context:
```bash
export FULL_WORKFLOW_MODE=true
```

Use the SlashCommand tool to execute plan creation with the user's prompt:
```
/tasks:create-plan $ARGUMENTS
```

**Note**: The FULL_WORKFLOW_MODE environment variable signals to subordinate commands that they are running in automated workflow mode and should suppress interactive prompts for plan review.

**Important**: The plan creation command may ask clarification questions. Wait for user responses before continuing. This is expected behavior and maintains quality control.

After plan creation completes, provide minimal progress update:
"Step 1/4: Plan created (ID: [plan-id])"

**CRITICAL**: Do not wait for user approval or review of the plan. In full-workflow mode, plan validation is automated (Step 3 performs file existence checking only). Proceed immediately to Step 3 without waiting for user input.
```

**Step 5: Validation**
- Verify the CRITICAL instruction remains intact
- Ensure bash code block is properly formatted
- Check that all existing instructions are preserved

</details>
