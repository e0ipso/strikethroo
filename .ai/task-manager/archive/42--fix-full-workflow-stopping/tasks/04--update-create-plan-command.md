---
id: 4
group: "templates"
dependencies: [3]
status: "completed"
created: "2025-10-17"
skills: ["markdown", "bash"]
---

# Task 04: Update create-plan Command to Write approval_method

## Objective

Modify the create-plan command template to write the `approval_method` field when generating plans, setting it based on the FULL_WORKFLOW_MODE environment variable.

## Skills Required

- `markdown`: Markdown template authoring
- `bash`: Bash conditional logic for environment variable checking

## Acceptance Criteria

1. create-plan command sets `approval_method: auto` when `FULL_WORKFLOW_MODE=true`
2. create-plan command sets `approval_method: manual` when `FULL_WORKFLOW_MODE=false` or unset
3. JSON schema updated to include optional `approval_method` string field
4. Field is written to plan frontmatter during plan generation
5. Backward compatibility maintained with environment variable check

## Technical Requirements

### Files to Modify

**templates/assistant/commands/tasks/create-plan.md**:
- Keep existing `FULL_WORKFLOW_MODE` check (line ~94-96)
- Update plan frontmatter generation to include `approval_method`
- Update JSON schema (line ~133-154) to include the new field

### Implementation Pattern

In the plan generation section, when writing frontmatter:
```yaml
---
id: ${PLAN_ID}
summary: "..."
created: ${DATE}
approval_method: ${APPROVAL_METHOD}
---
```

Where `APPROVAL_METHOD` is determined by:
```bash
if [ "${FULL_WORKFLOW_MODE}" = "true" ]; then
  APPROVAL_METHOD="auto"
else
  APPROVAL_METHOD="manual"
fi
```

## Input Dependencies

- Task 03 completed (plan template updated)
- Existing create-plan.md template
- Understanding of the plan generation workflow

## Output Artifacts

- Updated create-plan.md template with approval_method logic
- Updated JSON schema including the new field

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate create-plan Template

1. Open `templates/assistant/commands/tasks/create-plan.md`
2. Find the section that checks `FULL_WORKFLOW_MODE` (around line 94-96)
3. Locate where plan frontmatter is generated

### Step 2: Add approval_method Logic

1. In the Context-Aware Output Behavior section (line ~92-111), find where the environment variable is checked
2. After checking `FULL_WORKFLOW_MODE`, add logic to set `APPROVAL_METHOD`:
   ```markdown
   Set the approval method based on workflow mode:
   ```bash
   if [ "${FULL_WORKFLOW_MODE}" = "true" ]; then
     APPROVAL_METHOD="auto"
   else
     APPROVAL_METHOD="manual"
   fi
   ```
   ```
3. This should be added as instructional text for the AI executing the command

### Step 3: Update Frontmatter Generation Instructions

1. Find the Frontmatter Structure section (line ~122-154)
2. Update the example frontmatter to include:
   ```yaml
   ---
   id: 1
   summary: "..."
   created: 2025-09-01
   approval_method: "manual"
   ---
   ```
3. Add instructions to include the `approval_method` field when writing plans

### Step 4: Update JSON Schema

1. Locate the JSON schema definition (line ~133-154)
2. In the `properties` object, add after the `created` property:
   ```json
   "approval_method": {
     "type": "string",
     "enum": ["auto", "manual"],
     "description": "Workflow approval mode: auto for automated workflows, manual for standalone execution"
   }
   ```
3. Do NOT add `approval_method` to the `required` array - it must remain optional

### Step 5: Add Implementation Instructions

1. In the plan generation instructions, add a step that tells the AI to:
   - Check the `FULL_WORKFLOW_MODE` environment variable
   - Set `approval_method: auto` if true
   - Set `approval_method: manual` if false or unset
   - Include this field in the plan frontmatter

### Step 6: Test Template Changes

1. Build the project: `npm run build && npm start init --assistants claude`
2. The template will be copied to `.claude/commands/tasks/create-plan.md`
3. Test creating a plan in standalone mode (should set manual)
4. Test via full-workflow (should set auto)

</details>
