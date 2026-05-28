---
id: 2
group: "template-modification"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - markdown
  - bash
---
# Update create-plan Template for Context-Aware Output

## Objective
Modify the create-plan template to detect FULL_WORKFLOW_MODE and suppress "review the plan" instructions when running in automated workflow mode.

## Skills Required
- **markdown**: Template file editing and instruction formatting
- **bash**: Environment variable detection logic

## Acceptance Criteria
- [ ] Template checks FULL_WORKFLOW_MODE environment variable
- [ ] When FULL_WORKFLOW_MODE=true, only confirms plan creation with ID
- [ ] When FULL_WORKFLOW_MODE=false or unset, instructs user to review plan
- [ ] Both output modes provide clear, helpful messages
- [ ] Existing functionality remains intact

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- File: `templates/assistant/commands/tasks/create-plan.md`
- Modify Output Format section (around line 86-91)
- Add bash command to check environment variable
- Define conditional output behavior based on variable value

## Input Dependencies
None - can be done in parallel with task 01.

## Output Artifacts
- Updated create-plan.md template with context-aware output
- Clear documentation of both output modes

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

**Step 1: Locate the Target Section**
Open `templates/assistant/commands/tasks/create-plan.md` and find the "##### Output Format" section (around line 86-91).

**Step 2: Replace the Current Output Instructions**
Replace the existing text:
```markdown
Outside the plan document, be **extremely** concise. Just tell the user that you are done, and instruct them to review the plan document.
```

With the new context-aware instructions:

```markdown
**Context-Aware Output Behavior:**

First, check if running in automated full-workflow mode:
```bash
echo "${FULL_WORKFLOW_MODE:-false}"
```

Then adjust output based on context:

- **If `FULL_WORKFLOW_MODE=true` (automated workflow mode)**:
  - Simply confirm plan creation with the plan ID
  - Do NOT instruct user to review the plan document
  - Do NOT add any prompts that would pause execution
  - Example output: "Plan 40 created successfully"

- **If `FULL_WORKFLOW_MODE=false` or unset (standalone mode)**:
  - Be extremely concise but helpful
  - Tell the user that you are done
  - Instruct them to review the plan document with the file path
  - Example output: "Plan created. Please review: `.ai/task-manager/plans/40--plan-name/plan-40--plan-name.md`"
```

**Step 3: Verify Context**
Ensure the new instructions are placed within the "##### Output Format" section, AFTER the lines:
```markdown
Structure your response as follows:
- If context is insufficient: List specific clarifying questions
- If context is sufficient: Provide the comprehensive plan using the structure above. Use the information in @TASK_MANAGER.md for the directory structure and additional information about plans.
```

**Step 4: Validation**
- Verify bash syntax is correct for environment variable check
- Ensure both output modes are clearly documented
- Check that examples are helpful and accurate
- Confirm existing clarification question logic is preserved

**Step 5: Test Scenarios to Consider**
The updated template should handle:
1. Standalone create-plan execution (normal review prompt)
2. Full-workflow invocation (no review prompt)
3. Clarification questions (both modes wait for answers)
4. Error conditions (both modes report errors)

</details>
