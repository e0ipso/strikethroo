---
id: 1
group: "hook-template"
dependencies: []
status: "completed"
created: "2026-03-26"
skills:
  - markdown
---
# Create PRE_TASK_EXECUTION.md Hook Template

## Objective
Create the `PRE_TASK_EXECUTION.md` hook file in `templates/ai-task-manager/config/hooks/` following the established hook conventions. This hook instructs the AI assistant to perform pre-flight checks before each individual task execution.

## Skills Required
- markdown (prompt-style hook authoring following existing conventions)

## Acceptance Criteria
- [ ] File `templates/ai-task-manager/config/hooks/PRE_TASK_EXECUTION.md` exists
- [ ] Hook contains dependency verification using `check-task-dependencies.cjs`
- [ ] Hook contains frontmatter validation (required fields: id, group, dependencies, status, created, skills)
- [ ] Hook contains working directory state check via `git status --porcelain`
- [ ] Hook contains halt behavior instructions on failure
- [ ] Hook follows the same Markdown structure and tone as existing hooks (e.g., `PRE_TASK_ASSIGNMENT.md`, `PRE_PHASE.md`)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Follow the existing hook naming convention: `PRE_TASK_EXECUTION.md`
- Use the existing `check-task-dependencies.cjs` script for dependency validation
- Reference `$root` for paths, consistent with other hooks
- Include bash code blocks for validation scripts, matching the style of `PRE_PHASE.md`

## Input Dependencies
None — this is the first task with no dependencies.

## Output Artifacts
- `templates/ai-task-manager/config/hooks/PRE_TASK_EXECUTION.md` — the source template that gets copied on `npm start init`

## Implementation Notes

<details>

### Hook Structure

Model the file after `PRE_PHASE.md` and `PRE_TASK_ASSIGNMENT.md`. The hook should have these sections:

1. **Title**: `# PRE_TASK_EXECUTION Hook`
2. **Description paragraph**: Explain this hook runs before each individual task execution to perform pre-flight validation.
3. **Pre-Flight Checks section** with 4 subsections:

#### Dependency Verification
Use the existing script:
```bash
if ! node "$root/config/scripts/check-task-dependencies.cjs" "$1" "$TASK_ID"; then
    echo "ERROR: Task $TASK_ID has unresolved dependencies"
    exit 1
fi
```
Where `$1` is the plan ID and `$TASK_ID` is the current task ID.

#### Frontmatter Validation
Instruct the AI to read the task file and verify these required fields are present and valid:
- `id` (number)
- `group` (string)
- `dependencies` (array)
- `status` (must be "pending" or "in-progress", not "needs-clarification")
- `created` (YYYY-MM-DD format)
- `skills` (non-empty array)

#### Working Directory State
```bash
if [ -n "$(git status --porcelain)" ]; then
    echo "WARNING: Working directory has uncommitted changes before task $TASK_ID execution"
fi
```
This should be a warning, not a hard failure, since parallel tasks may create legitimate changes.

#### Halt Behavior
If any **hard failure** occurs (dependency unmet, frontmatter invalid/missing, status is "needs-clarification"):
- Halt task execution immediately
- Document the failure reason
- Do not dispatch the agent for this task

Warnings (like uncommitted changes) should be logged but not block execution.

### Reference Files
- Read `templates/ai-task-manager/config/hooks/PRE_PHASE.md` for structural reference
- Read `templates/ai-task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md` for tone and style reference
- Read `templates/ai-task-manager/config/hooks/POST_EXECUTION.md` for halt behavior reference

</details>
