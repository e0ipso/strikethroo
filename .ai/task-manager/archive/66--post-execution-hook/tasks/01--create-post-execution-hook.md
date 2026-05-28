---
id: 1
group: "hook-creation"
dependencies: []
status: "completed"
created: 2026-02-02
skills:
  - "markdown-authoring"
---
# Create POST_EXECUTION.md Hook File

## Objective
Create the `POST_EXECUTION.md` hook file in both the template source directory (`templates/ai-task-manager/config/hooks/`) and the project's live directory (`.ai/task-manager/config/hooks/`).

## Skills Required
- Markdown authoring following existing hook patterns

## Acceptance Criteria
- [ ] `POST_EXECUTION.md` exists in `templates/ai-task-manager/config/hooks/`
- [ ] `POST_EXECUTION.md` exists in `.ai/task-manager/config/hooks/`
- [ ] Hook follows the same documentation pattern as existing hooks (heading, description, actionable instructions)
- [ ] Hook instructs the AI to: run linting (if configured), run tests (if configured), verify all tasks have status "completed", report summary of accomplishments

## Technical Requirements
- Follow the pattern of existing hooks like `POST_PHASE.md` and `POST_PLAN.md`
- The hook fires after all blueprint phases complete, before summary generation and archival
- Validation failures should keep the plan in `plans/` for debugging

## Input Dependencies
None — this is a standalone file creation.

## Output Artifacts
- `templates/ai-task-manager/config/hooks/POST_EXECUTION.md`
- `.ai/task-manager/config/hooks/POST_EXECUTION.md`

## Implementation Notes
<details>

Create the hook file with the following structure:

1. **Title**: `# POST_EXECUTION Hook`
2. **Description**: Explain this hook fires after all blueprint phases complete successfully, before execution summary generation and plan archival.
3. **Validation Gates section**:
   - Run the project's linting checks if configured (`npm run lint` or equivalent)
   - Run the project's test suite if configured (`npm test` or equivalent)
   - Verify all tasks in the plan have `status: "completed"` in their frontmatter by checking each task file
4. **Reporting section**:
   - Summarize what was accomplished across all phases
5. **Failure behavior**: Document that if any validation gate fails, execution should halt and the plan should remain in `plans/` directory for debugging

Reference `POST_PHASE.md` for style:
```markdown
# POST_PHASE Hook

Ensure that:

 - The code base is passing the linting requirements
 - A descriptive commit ...
```

The POST_EXECUTION hook should be similar but broader in scope (whole execution, not just a phase) and include task status verification.

Write identical content to both locations:
- `templates/ai-task-manager/config/hooks/POST_EXECUTION.md`
- `.ai/task-manager/config/hooks/POST_EXECUTION.md`
</details>
