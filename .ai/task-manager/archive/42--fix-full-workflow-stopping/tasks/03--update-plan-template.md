---
id: 3
group: "templates"
dependencies: []
status: "completed"
created: "2025-10-17"
skills: ["markdown"]
---

# Task 03: Update Plan Template with approval_method Field

## Objective

Add `approval_method` as an optional field to the plan template with documentation explaining its purpose and valid values.

## Skills Required

- `markdown`: Markdown template authoring and YAML frontmatter

## Acceptance Criteria

1. PLAN_TEMPLATE.md includes `approval_method` in frontmatter example
2. Field is clearly marked as optional
3. Valid values ("auto" and "manual") are documented
4. Comment explains the field's purpose
5. Field placement is logical within frontmatter structure

## Technical Requirements

### Files to Modify

**templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md** (line ~1-5):
- Add `approval_method` field to frontmatter example
- Add comment explaining the field

### Implementation Pattern

```yaml
---
id: [PLAN-ID]
summary: "[Brief one-line description of what this plan accomplishes]"
created: [YYYY-MM-DD]
approval_method: [auto|manual]  # Optional: Workflow approval mode (auto=automated, manual=requires review)
---
```

## Input Dependencies

- Existing PLAN_TEMPLATE.md file
- Understanding of YAML frontmatter format

## Output Artifacts

- Updated PLAN_TEMPLATE.md with approval_method field documentation

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Open Template File

1. Navigate to `templates/ai-task-manager/config/templates/`
2. Open `PLAN_TEMPLATE.md`
3. Locate the YAML frontmatter section (lines 1-5)

### Step 2: Add approval_method Field

1. After the `created` field, add a new line:
   ```yaml
   approval_method: [auto|manual]  # Optional: Workflow approval mode (auto=automated, manual=requires review)
   ```
2. Use square brackets `[auto|manual]` to indicate placeholder values
3. Add inline comment explaining the field's purpose and valid values

### Step 3: Verify YAML Syntax

1. Ensure proper indentation (no leading spaces for top-level fields)
2. Verify colon placement: `field: value`
3. Check that placeholder format matches other fields (e.g., `[YYYY-MM-DD]`)
4. Confirm comment syntax uses `#` character

### Step 4: Test Template

1. The template is used by the create-plan command when generating new plans
2. Verify the field doesn't break YAML parsing when plans are created
3. The field is optional, so plans can be created with or without it

### Step 5: Documentation Clarity

1. The comment should be concise and clear
2. Explains what "auto" means (automated workflow, no approval prompts)
3. Explains what "manual" means (requires user review and approval)
4. Indicates the field is optional

</details>
