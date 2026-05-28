---
id: 2
group: "template-integration"
dependencies: [1]
status: "completed"
created: 2026-02-02
skills:
  - "markdown-authoring"
---
# Integrate POST_EXECUTION Hook into Execute-Blueprint and Full-Workflow Templates

## Objective
Wire the `POST_EXECUTION.md` hook into `execute-blueprint.md` and `full-workflow.md` templates so it fires after all phases complete but before summary generation and archival.

## Skills Required
- Markdown authoring with understanding of the template system

## Acceptance Criteria
- [ ] `templates/assistant/commands/tasks/execute-blueprint.md` references `POST_EXECUTION.md` hook before summary generation
- [ ] `templates/assistant/commands/tasks/full-workflow.md` references `POST_EXECUTION.md` hook before summary generation
- [ ] A checklist item for the hook is added to the execution tracking lists in both templates
- [ ] Both templates have identical hook integration

## Technical Requirements
- Insert hook reference in the "Post-Execution Processing" section, before "Execution Summary Generation"
- Add checklist item: `- [ ] Execute $root/.ai/task-manager/config/hooks/POST_EXECUTION.md hook after all phases complete.`

## Input Dependencies
- Task 1 must be complete (hook file must exist)

## Output Artifacts
- Modified `templates/assistant/commands/tasks/execute-blueprint.md`
- Modified `templates/assistant/commands/tasks/full-workflow.md`

## Implementation Notes
<details>

### execute-blueprint.md changes

1. In the "Execution Process" example checklist (around line 113-127), add before the "Update the Plan" line:
   ```
   - [ ] Execute $root/.ai/task-manager/config/hooks/POST_EXECUTION.md hook after all phases complete.
   ```

2. In the "Post-Execution Processing" section (around line 197-222), add a new step before "1. Execution Summary Generation":
   ```markdown
   ### 0. Post-Execution Validation

   Read and execute $root/.ai/task-manager/config/hooks/POST_EXECUTION.md

   If validation fails, halt execution. The plan remains in `plans/` for debugging.
   ```

   Update numbering: existing "1. Execution Summary Generation" becomes "1." stays, "2. Plan Archival" stays, but the new section goes before them.

### full-workflow.md changes

Apply the same pattern in the Step 3 section. In the "Post-Execution Processing" section (around line 442-462):

1. Add a checklist item for the hook
2. Add a new subsection before "Execution Summary Generation":
   ```markdown
   #### Post-Execution Validation

   Read and execute $root/.ai/task-manager/config/hooks/POST_EXECUTION.md

   If validation fails, halt execution. The plan remains in `plans/` for debugging.
   ```
</details>
