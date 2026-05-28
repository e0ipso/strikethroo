---
id: 6
group: "command-templates"
dependencies: [2]
status: "completed"
created: "2025-10-20"
skills:
  - markdown
  - bash
---
# Update full-workflow Command Template

## Objective

Simplify the full-workflow command by removing the explicit generate-tasks step, deferring task generation to execute-blueprint, and updating to use `approval_method_plan` field.

## Skills Required

- **markdown**: Command template documentation and workflow instructions
- **bash**: Script invocation and workflow orchestration

## Acceptance Criteria

- [ ] Step 3 (generate-tasks invocation) removed from workflow
- [ ] Workflow reduced to 2 steps: create-plan → execute-blueprint
- [ ] Script call updated to set `approval_method_plan` (not old `approval_method`)
- [ ] Todo list tracking updated to reflect 2-step workflow
- [ ] Documentation updated to explain simplified workflow
- [ ] Old Step 3 references and progress messaging removed

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/assistant/commands/tasks/full-workflow.md`

**Major changes:**

1. **Remove Step 3** (around line 85-107):
   - Delete entire "Step 3: Execute Task Generation" section
   - Update step numbers: old Step 4 becomes new Step 3

2. **Update Step 2** (around line 54-84):
   - Change script invocation from `approval_method` to `approval_method_plan`
   - Keep all other logic the same

3. **Update tracking todo list** (around line 36-40):
   - Change from 4 steps to 3 steps
   - Remove "Execute /tasks:generate-tasks" item

**Updated workflow structure:**
```
- [ ] Execute /tasks:create-plan
- [ ] Extract plan ID and set approval_method_plan to auto
- [ ] Execute /tasks:execute-blueprint
```

## Input Dependencies

- Task 2 (script enhancement) must be complete so the script supports `approval_method_plan`
- Task 5 (execute-blueprint update) should be coordinated with this to ensure blueprint handles task generation

## Output Artifacts

Updated `full-workflow.md` template that:
- Implements simplified 2-step workflow
- Uses correct approval field name
- Defers task generation to execute-blueprint
- Maintains clean automation experience

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Locate the template file:**
   ```bash
   templates/assistant/commands/tasks/full-workflow.md
   ```

2. **Update the todo list tracking (around line 36-41):**
   Change from:
   ```
   - [ ] Execute /tasks:create-plan
   - [ ] Extract plan ID from created plan
   - [ ] Execute /tasks:generate-tasks
   - [ ] Execute /tasks:execute-blueprint
   ```

   To:
   ```
   - [ ] Execute /tasks:create-plan
   - [ ] Extract plan ID and set approval_method_plan to auto
   - [ ] Execute /tasks:execute-blueprint
   ```

3. **Update Step 2 script invocation (around line 75-83):**
   Change from:
   ```bash
   # Set approval_method to auto for automated workflow execution
   node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto
   ```

   To:
   ```bash
   # Set approval_method_plan to auto for automated workflow execution
   # This ensures generate-tasks and execute-blueprint run without interruption for plan review
   node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto plan
   ```

4. **Update Step 2 documentation (around line 84):**
   Change from:
   ```
   **Note**: Setting `approval_method: auto` in the plan metadata signals to subordinate commands...
   ```

   To:
   ```
   **Note**: Setting `approval_method_plan: auto` in the plan metadata signals to subordinate commands (execute-blueprint) that they are running in automated workflow mode and should suppress interactive prompts for plan review. Task generation will be handled automatically by execute-blueprint, which will set `approval_method_tasks: auto` if needed. This metadata persists in the plan document and is reliably read by subsequent commands.
   ```

5. **Delete entire Step 3 section (around line 86-107):**
   Remove the "Execute Task Generation" section completely, including:
   - The instructions
   - The SlashCommand invocation
   - The progress update
   - The structured output example

6. **Rename old Step 4 to Step 3 (around line 109-132):**
   Change heading from "#### Step 4: Execute Blueprint" to "#### Step 3: Execute Blueprint"

   Update the progress message from:
   ```
   Provide a progress update: "Step 3/3: Blueprint execution completed"
   ```

   To:
   ```
   Provide a progress update: "Step 2/2: Blueprint execution completed"
   ```

7. **Update any remaining step references:**
   Search the document for references to "Step 3" or "Step 4" and update accordingly.

8. **Update the overview/summary section** (if present at top):
   If there's any introductory text explaining the 3-step workflow, update it to describe the 2-step workflow:
   - Step 1: Create Plan
   - Step 2: Execute Blueprint (which handles task generation automatically if needed)

9. **Verification:**
   - Ensure all step numbers are sequential (1, 2, 3)
   - Verify no orphaned references to the removed generate-tasks step
   - Check that the simplified workflow is clear and well-documented
   - Ensure script invocation uses the correct field name (`plan`)

</details>
