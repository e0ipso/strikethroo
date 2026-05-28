---
id: 2
group: "template-refactoring"
dependencies: [1]
status: "completed"
created: 2025-09-25
skills: ["markdown", "template-architecture"]
---
# Refactor create-plan.md Template

## Objective
Refactor the create-plan.md template to reference PRE_PLAN.md hook and remove the sections that were extracted, while maintaining all existing functionality and user-facing workflow.

## Skills Required
- **markdown**: For editing template structure and formatting
- **template-architecture**: For proper hook integration and template mechanics

## Acceptance Criteria
- [ ] PRE_PLAN.md hook reference added to process instructions (similar to POST_PLAN.md)
- [ ] Scope Control Guidelines section (lines 43-59) removed from create-plan.md
- [ ] Simplicity Principles section (lines 61-71) removed from create-plan.md
- [ ] Critical Notes section (lines 124-129) removed from create-plan.md
- [ ] All other template functionality preserved (plan generation, output formatting, frontmatter)
- [ ] Template maintains existing user workflow and command interface

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
Modify `/workspace/templates/assistant/commands/tasks/create-plan.md` to:
- Add reference to PRE_PLAN.md hook in the Process section
- Remove the three specific sections that were moved to PRE_PLAN.md
- Preserve all other content including frontmatter, plan template references, and ID generation

## Input Dependencies
- Completed PRE_PLAN.md hook file (Task 1)
- Original create-plan.md template with embedded sections to remove

## Output Artifacts
- Refactored create-plan.md template with hook integration
- Streamlined template focusing on plan generation mechanics
- Preserved template functionality with reduced redundancy

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Add PRE_PLAN.md hook reference**:
   - Locate the "Process" section in create-plan.md
   - Add reference to PRE_PLAN.md similar to how POST_PLAN.md is referenced (around line 32)
   - Use language like "Read and execute /config/hooks/PRE_PLAN.md"

2. **Remove Scope Control Guidelines** (lines 43-59):
   - Delete the entire "##### Scope Control Guidelines" section
   - Remove all subsections including "Critical: Implement ONLY what is explicitly requested"
   - Remove the anti-pattern lists and validation questions
   - Ensure no orphaned content remains

3. **Remove Simplicity Principles** (lines 61-71):
   - Delete the entire "##### Simplicity Principles" section
   - Remove all guidance on maintainability and over-engineering
   - Remove the closing reminder about simple solutions
   - Maintain proper section flow after removal

4. **Remove Critical Notes** (lines 124-129):
   - Delete the "### Critical Notes" section
   - Remove guidance about partial plans and context validation
   - Ensure the section above and below connect properly

5. **Preserve essential template content**:
   - Keep all frontmatter and argument processing
   - Maintain plan generation instructions and structure
   - Preserve output format specifications
   - Keep plan template and ID generation sections
   - Maintain all patterns to avoid and validation checklist items not related to the removed sections

6. **Verify template integrity**:
   - Ensure markdown structure remains valid after deletions
   - Confirm all remaining sections flow logically
   - Verify no broken references or orphaned content
   - Check that the template maintains its core plan generation functionality

7. **Test integration**:
   - Confirm PRE_PLAN.md hook reference is properly placed
   - Ensure removed sections don't leave gaps in the workflow
   - Verify template still provides complete guidance for plan creation

</details>