---
id: 4
group: "command-templates"
dependencies: [2]
status: "completed"
created: "2025-10-20"
skills:
  - markdown
  - bash
---
# Update generate-tasks Command Template

## Objective

Update the generate-tasks command to read `approval_method_tasks` field instead of `approval_method` when determining output verbosity and workflow behavior.

## Skills Required

- **markdown**: Command template documentation
- **bash**: Frontmatter extraction patterns and conditional logic

## Acceptance Criteria

- [ ] Bash extraction pattern updated to read `approval_method_tasks` field
- [ ] Output behavior respects `approval_method_tasks` value
- [ ] Auto mode provides minimal output without review prompts
- [ ] Manual mode provides detailed output with review instructions
- [ ] Old `approval_method` field references removed from extraction logic

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/assistant/commands/tasks/generate-tasks.md`

**Changes needed:**

1. **Extraction pattern section** (around line 300-315):
   - Update bash script to extract `approval_method_tasks` instead of `approval_method`
   - Keep default value as "manual" for backward compatibility

2. **Output behavior section** (around line 315-330):
   - Update conditional logic to check `APPROVAL_METHOD_TASKS` variable
   - Maintain same behavior: auto=minimal, manual=detailed

**New extraction pattern:**
```bash
# Find plan file by ID
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-$1--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)

# Extract approval_method_tasks from YAML frontmatter
APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' | sed 's/approval_method_tasks: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

# Default to "manual" if field doesn't exist
APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
```

## Input Dependencies

- Task 2 (script enhancement) must be complete so the script API is understood
- Plans will have the new fields after Task 1 and Task 3 are complete

## Output Artifacts

Updated `generate-tasks.md` template that:
- Reads the correct approval field for task generation context
- Adjusts output verbosity appropriately
- Maintains structured output format

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Locate the template file:**
   ```bash
   templates/assistant/commands/tasks/generate-tasks.md
   ```

2. **Find the extraction section (around line 300-315):**
   Search for:
   ```
   # Extract approval_method from YAML frontmatter
   APPROVAL_METHOD=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method:' ...
   ```

   Replace the variable name and field name:
   ```bash
   # Extract approval_method_tasks from YAML frontmatter
   APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' | sed 's/approval_method_tasks: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

   # Default to "manual" if field doesn't exist (backward compatibility)
   APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
   ```

3. **Update the conditional logic (around line 315-330):**
   Search for:
   ```
   - **If `APPROVAL_METHOD="auto"` ...
   ```

   Replace with:
   ```
   - **If `APPROVAL_METHOD_TASKS="auto"` (automated workflow mode)**:
     - Simply confirm task generation with task count
     - Do NOT instruct user to review the tasks
     - Do NOT add any prompts that would pause execution
     - Example output: "Tasks generated for plan [id]: [count] tasks created"

   - **If `APPROVAL_METHOD_TASKS="manual"` or empty (standalone mode)**:
     - Be concise but helpful
     - Tell the user that you are done
     - Instruct them to review the tasks with file paths
     - Example output: "Task generation complete. Review tasks in: `.ai/task-manager/plans/[plan-id]--[name]/tasks/`"
   ```

4. **Update documentation:**
   - Update any comments explaining the extraction pattern
   - Ensure the documentation reflects that this reads the task-specific approval field

5. **Verify bash syntax:**
   - Check that all quotes are properly escaped
   - Ensure sed patterns are correct
   - Test extraction logic if possible

6. **Note:** This template gets processed for all assistant variants, so ensure the markdown/bash is compatible with all formats.

</details>
