---
id: 3
group: "command-templates"
dependencies: [2]
status: "completed"
created: "2025-10-20"
skills:
  - markdown
  - yaml
---
# Update create-plan Command Template

## Objective

Update the create-plan command template to use dual approval method fields (`approval_method_plan` and `approval_method_tasks`) in the frontmatter schema, examples, and documentation.

## Skills Required

- **markdown**: Command template documentation structure
- **yaml**: Frontmatter schema definitions and examples

## Acceptance Criteria

- [ ] Frontmatter example shows both `approval_method_plan` and `approval_method_tasks`
- [ ] JSON schema documentation updated with both fields
- [ ] Both fields set to "manual" by default in instructions
- [ ] Old `approval_method` field references removed
- [ ] Instruction to set both fields to "manual" when creating plans

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/assistant/commands/tasks/create-plan.md`

**Note:** This is the source template that gets processed for all 3 assistant variants (Claude, Gemini, Open Code).

**Changes needed:**

1. **Frontmatter example section** (around line 115-130):
   - Replace `approval_method:` with `approval_method_plan:` and `approval_method_tasks:`
   - Show both set to "manual"

2. **JSON schema section** (around line 135-155):
   - Remove old `approval_method` field definition
   - Add `approval_method_plan` field definition
   - Add `approval_method_tasks` field definition
   - Both should be optional, enum ["auto", "manual"], with descriptions

3. **Documentation text**:
   - Update any prose that mentions `approval_method`
   - Explain the purpose of each field briefly

## Input Dependencies

- Task 2 (script enhancement) must be complete so the script API is finalized
- Plan template update (Task 1) provides schema reference, but not strictly required

## Output Artifacts

Updated `create-plan.md` template that:
- Generates plans with dual approval fields
- Documents the new schema clearly
- Maintains consistency with the plan template

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Locate the source template:**
   ```bash
   templates/assistant/commands/tasks/create-plan.md
   ```

2. **Update the frontmatter example (around line 115-130):**
   ```yaml
   ---
   id: 1
   summary: "Implement CI/CD pipeline..."
   created: 2025-09-01
   approval_method_plan: "manual"
   approval_method_tasks: "manual"
   ---
   ```

3. **Update the JSON schema (around line 135-155):**
   ```json
   {
     "type": "object",
     "required": ["id", "summary", "created"],
     "properties": {
       "id": { ... },
       "summary": { ... },
       "created": { ... },
       "approval_method_plan": {
         "type": "string",
         "enum": ["auto", "manual"],
         "description": "Workflow approval mode for plan review: auto for automated workflows, manual for standalone execution"
       },
       "approval_method_tasks": {
         "type": "string",
         "enum": ["auto", "manual"],
         "description": "Workflow approval mode for task generation review: auto when tasks auto-generated in workflow, manual for standalone execution"
       }
     },
     "additionalProperties": false
   }
   ```

4. **Update instructions text (around line 147):**
   Find the section that says:
   ```
   **Important**: Always set `approval_method` to "manual" when creating a plan.
   ```

   Replace with:
   ```
   **Important**: Always set both `approval_method_plan` and `approval_method_tasks` to "manual" when creating a plan. The full-workflow command will modify these fields to "auto" after creation if running in automated mode.
   ```

5. **Search and replace:**
   - Search for any remaining instances of standalone `approval_method` field
   - Replace with appropriate dual field reference
   - Be careful not to change the old examples/documentation that explain backward compatibility (if any)

6. **Verify template processing:**
   After making changes, the template system will process this file for all assistant types. Ensure:
   - YAML syntax is valid
   - JSON schema is valid
   - Markdown formatting is preserved

</details>
