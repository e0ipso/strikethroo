---
id: 5
group: "command-templates"
dependencies: [2]
status: "completed"
created: "2025-10-20"
skills:
  - markdown
  - bash
---
# Update execute-blueprint Command Template

## Objective

Update the execute-blueprint command to: (1) read both approval method fields for context-aware output, and (2) automatically set `approval_method_tasks: auto` after auto-generating tasks during execution.

## Skills Required

- **markdown**: Command template documentation
- **bash**: Script invocation, frontmatter extraction, conditional logic

## Acceptance Criteria

- [ ] Script invocation added after auto-generating tasks
- [ ] Sets `approval_method_tasks: auto` when tasks are generated
- [ ] Extraction pattern reads both `approval_method_plan` and `approval_method_tasks`
- [ ] Output behavior respects both approval fields appropriately
- [ ] Documentation updated to explain new behavior
- [ ] Old `approval_method` references removed

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/assistant/commands/tasks/execute-blueprint.md`

**Two main changes:**

1. **Add script call after task generation** (around line 70-80):
   After the `/tasks:generate-tasks` invocation succeeds, add:
   ```bash
   node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto tasks
   ```

2. **Update extraction pattern** (around line 145-165):
   Extract both fields instead of just one:
   ```bash
   # Extract both approval fields
   APPROVAL_METHOD_PLAN=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_plan:' | sed 's/approval_method_plan: *//;s/"//g;s/'"'"'//g' | tr -d ' ')
   APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' | sed 's/approval_method_tasks: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

   # Defaults
   APPROVAL_METHOD_PLAN=${APPROVAL_METHOD_PLAN:-manual}
   APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
   ```

## Input Dependencies

- Task 2 (script enhancement) must be complete so the script can be invoked correctly
- The script must support the third `tasks` parameter

## Output Artifacts

Updated `execute-blueprint.md` template that:
- Auto-sets approval_method_tasks when generating tasks
- Reads both approval fields for output control
- Provides seamless automated workflow experience

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Locate the template file:**
   ```bash
   templates/assistant/commands/tasks/execute-blueprint.md
   ```

2. **Find the automatic task generation section (around line 66-82):**
   Look for the validation steps where it checks for missing tasks and invokes `/tasks:generate-tasks`.

   Currently it says:
   ```
   - **CRITICAL**: After task generation completes successfully, you MUST immediately proceed with blueprint execution without waiting for user input. The workflow should continue seamlessly.
   ```

   After the `/tasks:generate-tasks` invocation, add:
   ```
   - **NEW STEP**: Immediately after task generation succeeds, set the approval_method_tasks field to auto:
     ```bash
     node .ai/task-manager/config/scripts/set-approval-method.cjs "$PLAN_FILE" auto tasks
     ```
   - This signals that tasks were auto-generated in workflow context and execution should continue without pause.
   - **CRITICAL**: After setting the field, immediately proceed with blueprint execution without waiting for user input.
   ```

3. **Update the extraction pattern section (around line 145-165):**
   Find the section titled "Extract approval method from plan metadata:"

   Replace:
   ```bash
   # Extract approval_method from YAML frontmatter
   APPROVAL_METHOD=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method:' | sed 's/approval_method: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

   # Default to "manual" if field doesn't exist (backward compatibility)
   APPROVAL_METHOD=${APPROVAL_METHOD:-manual}
   ```

   With:
   ```bash
   # Extract both approval method fields from YAML frontmatter
   APPROVAL_METHOD_PLAN=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_plan:' | sed 's/approval_method_plan: *//;s/"//g;s/'"'"'//g' | tr -d ' ')
   APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' | sed 's/approval_method_tasks: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

   # Defaults to "manual" if fields don't exist
   APPROVAL_METHOD_PLAN=${APPROVAL_METHOD_PLAN:-manual}
   APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
   ```

4. **Update the output behavior documentation (around line 162-180):**
   The current documentation checks a single `APPROVAL_METHOD`. Update to use the appropriate field for each context:

   ```
   Then adjust output based on the extracted approval methods:

   - **If `APPROVAL_METHOD_PLAN="auto"` (automated workflow mode)**:
     - During task auto-generation phase: Provide minimal progress updates
     - Do NOT instruct user to review the plan or tasks being generated
     - Do NOT add any prompts that would pause execution

   - **If `APPROVAL_METHOD_TASKS="auto"` (tasks auto-generated in workflow)**:
     - During task execution phase: Provide minimal progress updates at phase boundaries
     - Do NOT instruct user to review implementation details
     - Example output: "Phase 1/3 completed. Proceeding to Phase 2."

   - **If `APPROVAL_METHOD_PLAN="manual"` or `APPROVAL_METHOD_TASKS="manual"` (standalone mode)**:
     - Provide detailed execution summary with phase results
     - List completed tasks and any noteworthy events
     - Instruct user to review the execution summary in the plan document
     - Example output: "Execution completed. Review summary: `.ai/task-manager/archive/[plan]/plan-[id].md`"
   ```

5. **Add documentation note:**
   Add a note explaining the dual approval logic:
   ```
   **Note**: This command respects both approval method fields:
   - `approval_method_plan`: Used during auto-generation to determine if we're in automated workflow
   - `approval_method_tasks`: Used during execution to determine output verbosity
   ```

6. **Verification:**
   - Ensure bash syntax is correct
   - Check that the script invocation happens at the right point
   - Verify extraction patterns are valid
   - Ensure documentation is clear and accurate

</details>
