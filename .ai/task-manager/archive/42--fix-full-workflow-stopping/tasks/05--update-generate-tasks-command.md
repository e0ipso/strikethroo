---
id: 5
group: "templates"
dependencies: [3]
status: "completed"
created: "2025-10-17"
skills: ["markdown", "bash"]
---

# Task 05: Update generate-tasks Command to Read approval_method

## Objective

Replace the `FULL_WORKFLOW_MODE` environment variable check in generate-tasks command with bash commands that extract `approval_method` from plan frontmatter and use it to determine output behavior.

## Skills Required

- `markdown`: Markdown template authoring
- `bash`: Bash scripting for YAML parsing with sed/grep

## Acceptance Criteria

1. generate-tasks extracts `approval_method` from plan frontmatter using bash
2. Conditional output logic uses extracted metadata instead of environment variable
3. When `approval_method == "auto"`: minimal output, no review prompts
4. When `approval_method == "manual"` or unset: detailed output with file paths
5. Bash extraction defaults to "manual" for backward compatibility
6. Existing functionality preserved

## Technical Requirements

### Files to Modify

**templates/assistant/commands/tasks/generate-tasks.md** (line ~300-305):
- Replace `echo "${FULL_WORKFLOW_MODE:-false}"` with bash extraction pattern
- Update conditional logic to check `APPROVAL_METHOD` variable
- Add bash commands before the conditional section

### Bash Extraction Pattern

```bash
# Find plan file by ID
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-$1--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)

# Extract approval_method from YAML frontmatter
APPROVAL_METHOD=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method:' | sed 's/approval_method: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

# Default to "manual" if field doesn't exist (backward compatibility)
APPROVAL_METHOD=${APPROVAL_METHOD:-manual}
```

### Conditional Logic Update

```bash
# Old (line ~300-305):
echo "${FULL_WORKFLOW_MODE:-false}"

# New:
# Use extracted APPROVAL_METHOD for conditional logic
if [ "$APPROVAL_METHOD" = "auto" ]; then
  # Minimal output mode
else
  # Detailed output mode
fi
```

## Input Dependencies

- Task 03 completed (plan template includes field)
- Plan document with ID $1 exists
- Bash utilities: find, grep, sed, tr

## Output Artifacts

- Updated generate-tasks.md template with metadata extraction logic
- Removed dependency on FULL_WORKFLOW_MODE environment variable

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate Current Environment Check

1. Open `templates/assistant/commands/tasks/generate-tasks.md`
2. Find the "Context-Aware Output Behavior" section (around line 297-319)
3. Locate where `echo "${FULL_WORKFLOW_MODE:-false}"` is used

### Step 2: Add Bash Extraction Section

1. Before the conditional output section, add new instructions:
   ```markdown
   **Extract approval method from plan metadata:**

   First, extract the approval_method from the plan document:

   \`\`\`bash
   # Find plan file by ID
   PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-$1--*.md" -type f -exec grep -l "^id: \\?$1$" {} \\;)

   # Extract approval_method from YAML frontmatter
   APPROVAL_METHOD=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method:' | sed 's/approval_method: *//;s/"//g;s/'"'"'//g' | tr -d ' ')

   # Default to "manual" if field doesn't exist (backward compatibility)
   APPROVAL_METHOD=${APPROVAL_METHOD:-manual}
   \`\`\`
   ```

### Step 3: Update Conditional Logic

1. Replace the environment variable check section with:
   ```markdown
   Then adjust output based on the extracted approval method:

   - **If `APPROVAL_METHOD="auto"` (automated workflow mode)**:
     - Simply confirm task generation with task count
     - Do NOT instruct user to review the tasks
     - Do NOT add any prompts that would pause execution
     - Example output: "Tasks generated for plan [id]: [count] tasks created"

   - **If `APPROVAL_METHOD="manual"` or empty (standalone mode)**:
     - Be concise but helpful
     - Tell the user that you are done
     - Instruct them to review the tasks with file paths
     - Example output: "Task generation complete. Review tasks in: `.ai/task-manager/plans/[plan-id]--[name]/tasks/`"
   ```

### Step 4: Remove Old Environment Variable Reference

1. Delete or comment out the line: `echo "${FULL_WORKFLOW_MODE:-false}"`
2. Remove any references to `FULL_WORKFLOW_MODE` in this section
3. Keep the conditional output behavior structure, just update the condition check

### Step 5: Update Section Title

1. Change "Context-Aware Output Behavior" to remain the same
2. Update the instructional text to explain that approval method comes from plan metadata
3. Note that this eliminates subprocess environment variable dependency

### Step 6: Test Template

1. Build and deploy: `npm run build && npm start init --assistants claude`
2. Test with a plan that has `approval_method: auto` (should show minimal output)
3. Test with a plan that has `approval_method: manual` (should show detailed output)
4. Test with an old plan without the field (should default to manual, show detailed output)

</details>
