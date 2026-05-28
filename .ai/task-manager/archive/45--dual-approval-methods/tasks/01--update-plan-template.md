---
id: 1
group: "schema-foundation"
dependencies: []
status: "completed"
created: "2025-10-20"
skills:
  - markdown
  - yaml
---
# Update PLAN_TEMPLATE.md with Dual Approval Fields

## Objective

Update the plan template to include both `approval_method_plan` and `approval_method_tasks` fields in the frontmatter, replacing references to the single `approval_method` field.

## Skills Required

- **markdown**: Template file formatting and structure
- **yaml**: Frontmatter schema definition and examples

## Acceptance Criteria

- [ ] Frontmatter example includes both `approval_method_plan` and `approval_method_tasks` fields
- [ ] Both fields default to "manual" in the example
- [ ] Documentation explains the purpose of each field
- [ ] JSON schema comment block updated to reflect dual fields
- [ ] Old `approval_method` field references removed

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md`

**Frontmatter changes:**
```yaml
---
id: [PLAN-ID]
summary: "[Brief one-line description]"
created: [YYYY-MM-DD]
approval_method_plan: [auto|manual]  # Workflow approval for plan review
approval_method_tasks: [auto|manual]  # Workflow approval for task generation review
---
```

**Documentation to add:**
- Explain that `approval_method_plan` controls post-plan-creation review
- Explain that `approval_method_tasks` controls post-task-generation review
- Note that both default to "manual" for standalone execution
- Indicate that full-workflow sets these to "auto" automatically

## Input Dependencies

None - this is a foundational task that defines the schema.

## Output Artifacts

Updated `PLAN_TEMPLATE.md` that:
- Defines the dual approval method schema
- Provides clear documentation for each field
- Serves as the reference for all plan documents

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Locate the template file:**
   ```bash
   # File path
   templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md
   ```

2. **Update the frontmatter example (lines 1-6):**
   - Replace single `approval_method:` line with two fields
   - Add `approval_method_plan: [auto|manual]`
   - Add `approval_method_tasks: [auto|manual]`
   - Include inline comments explaining each field

3. **Remove old schema references:**
   - Search for any mentions of standalone `approval_method` field
   - Replace with references to the appropriate dual field

4. **Keep it simple:**
   - Don't add extra fields not mentioned in the plan
   - Maintain existing template structure and sections
   - Focus only on the approval method fields

5. **Verification:**
   - Ensure YAML syntax is valid
   - Confirm both fields are documented
   - Check that no old `approval_method` references remain

</details>
