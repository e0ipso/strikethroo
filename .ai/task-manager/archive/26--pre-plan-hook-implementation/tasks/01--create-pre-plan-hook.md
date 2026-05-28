---
id: 1
group: "hook-implementation"
dependencies: []
status: "completed"
created: 2025-09-25
skills: ["markdown", "template-architecture"]
---
# Create PRE_PLAN.md Hook File

## Objective
Create the PRE_PLAN.md hook file by extracting specific pre-planning content from the existing create-plan.md template, following the established hook pattern.

## Skills Required
- **markdown**: For creating and formatting the hook file with proper structure
- **template-architecture**: For understanding hook patterns and template integration

## Acceptance Criteria
- [ ] PRE_PLAN.md hook file created in `.ai/task-manager/config/hooks/`
- [ ] File contains only content moved from create-plan.md (no new language introduced)
- [ ] Scope Control Guidelines section (lines 43-59) extracted from create-plan.md
- [ ] Simplicity Principles section (lines 61-71) extracted from create-plan.md
- [ ] Critical Notes section (lines 124-129) extracted from create-plan.md
- [ ] Hook follows same structural pattern as existing POST_PLAN.md

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
Extract the following specific sections from `/workspace/templates/assistant/commands/tasks/create-plan.md`:
- Scope Control Guidelines (lines 43-59): YAGNI enforcement and anti-patterns
- Simplicity Principles (lines 61-71): Maintainability-first approach
- Critical Notes (lines 124-129): Validation requirements for adequate context

Create hook file at: `/workspace/.ai/task-manager/config/hooks/PRE_PLAN.md`

## Input Dependencies
- Existing create-plan.md template with embedded pre-planning content
- POST_PLAN.md hook as structural reference pattern

## Output Artifacts
- PRE_PLAN.md hook file containing extracted pre-planning guidance
- Hook file ready for integration into create-plan.md template

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

1. **Read create-plan.md template**: Examine `/workspace/templates/assistant/commands/tasks/create-plan.md` to identify the exact content of the three sections to extract

2. **Create hook file structure**:
   - Create `/workspace/.ai/task-manager/config/hooks/PRE_PLAN.md`
   - Follow similar structure to POST_PLAN.md hook
   - Add appropriate header and introduction explaining the hook's purpose

3. **Extract Scope Control Guidelines** (lines 43-59):
   - Include the entire "Scope Control Guidelines" section
   - Preserve all subsections: Minimal Viable Implementation, Question Everything Extra, etc.
   - Keep all anti-pattern lists and validation questions intact

4. **Extract Simplicity Principles** (lines 61-71):
   - Include the complete "Simplicity Principles" section
   - Preserve all guidance on maintainability, over-engineering avoidance, etc.
   - Keep the closing reminder about working simple solutions

5. **Extract Critical Notes** (lines 124-129):
   - Include the "Critical Notes" section with all validation requirements
   - Preserve guidance about partial plans, accuracy, and context requirements

6. **Organize hook content**:
   - Add clear section headers to separate the extracted content
   - Ensure the hook explains when and how to apply each section
   - Maintain the exact language from create-plan.md without modifications

7. **Validate hook structure**:
   - Ensure hook follows established pattern from POST_PLAN.md
   - Verify all extracted content is properly formatted in Markdown
   - Confirm no new language or content has been added beyond what exists in create-plan.md

</details>