---
id: 6
group: "templates"
dependencies: [3]
status: "completed"
created: "2025-10-17"
skills: ["markdown", "bash"]
---

# Task 06: Update execute-blueprint Command to Read approval_method

## Objective

Replace the `FULL_WORKFLOW_MODE` environment variable check in execute-blueprint command with bash commands that extract `approval_method` from plan frontmatter and use it to determine output behavior.

## Skills Required

- `markdown`: Markdown template authoring
- `bash`: Bash scripting for YAML parsing with sed/grep

## Acceptance Criteria

1. execute-blueprint extracts `approval_method` from plan frontmatter using bash
2. Conditional output logic uses extracted metadata instead of environment variable
3. When `approval_method == "auto"`: minimal progress updates, no review prompts
4. When `approval_method == "manual"` or unset: detailed execution summary with file paths
5. Bash extraction defaults to "manual" for backward compatibility
6. Existing functionality preserved

## Technical Requirements

### Files to Modify

**templates/assistant/commands/tasks/execute-blueprint.md** (line ~143-149):
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
# Old (line ~143-149):
echo "${FULL_WORKFLOW_MODE:-false}"

# New:
# Use extracted APPROVAL_METHOD for conditional logic
if [ "$APPROVAL_METHOD" = "auto" ]; then
  # Minimal progress updates mode
else
  # Detailed summary mode
fi
```

## Input Dependencies

- Task 03 completed (plan template includes field)
- Plan document with ID $1 exists
- Bash utilities: find, grep, sed, tr

## Output Artifacts

- Updated execute-blueprint.md template with metadata extraction logic
- Removed dependency on FULL_WORKFLOW_MODE environment variable

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate Current Environment Check

1. Open `templates/assistant/commands/tasks/execute-blueprint.md`
2. Find the "Output Requirements" section (around line 140-162)
3. Locate the "Context-Aware Output Behavior" subsection
4. Find where `echo "${FULL_WORKFLOW_MODE:-false}"` is used (line ~143)

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
     - Provide minimal progress updates at phase boundaries
     - Do NOT instruct user to review implementation details
     - Do NOT add any prompts that would pause execution
     - Example output: "Phase 1/3 completed. Proceeding to Phase 2."

   - **If `APPROVAL_METHOD="manual"` or empty (standalone mode)**:
     - Provide detailed execution summary with phase results
     - List completed tasks and any noteworthy events
     - Instruct user to review the execution summary in the plan document
     - Example output: "Execution completed. Review summary: `.ai/task-manager/archive/[plan]/plan-[id].md`"
   ```

### Step 4: Remove Old Environment Variable Reference

1. Delete or comment out the line: `echo "${FULL_WORKFLOW_MODE:-false}"`
2. Remove any references to `FULL_WORKFLOW_MODE` in the Output Requirements section
3. Keep the conditional output behavior structure, just update the condition check

### Step 5: Ensure Consistency with generate-tasks

1. The bash extraction pattern should be identical to task 05
2. The conditional logic structure should match task 05's approach
3. Both commands should handle the same values: "auto" and "manual"
4. Both should default to "manual" for backward compatibility

### Step 6: Test Template

1. Build and deploy: `npm run build && npm start init --assistants claude`
2. Test with a plan that has `approval_method: auto` (should show minimal progress)
3. Test with a plan that has `approval_method: manual` (should show detailed summary)
4. Test with an old plan without the field (should default to manual, show detailed output)
5. Verify full-workflow completes without stopping

</details>
