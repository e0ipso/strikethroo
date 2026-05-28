---
id: 2
group: "integration"
dependencies: [1]
status: "completed"
created: "2025-09-08"
skills: ["documentation"]
---

## Objective
Update all references to `check-task-dependencies.sh` in prompt templates to use the new Node.js script with correct execution syntax.

## Skills Required
- **documentation**: Editing Markdown template files and updating command references

## Acceptance Criteria
- [ ] All bash script references in `templates/assistant/commands/tasks/execute-task.md` updated
- [ ] All bash script references in `templates/assistant/commands/tasks/execute-blueprint.md` updated
- [ ] Script invocation changed from bash syntax to Node.js syntax
- [ ] Maintained functionality and error handling context in templates
- [ ] No broken references or incorrect command syntax

## Technical Requirements
- Update references from `@templates/ai-task-manager/config/scripts/check-task-dependencies.sh`
- Change to `node @templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`
- Preserve all command-line arguments and usage examples
- Maintain identical conditional logic and error handling around script calls
- Ensure all template documentation reflects new execution method

## Input Dependencies
- Completed Node.js script from Task 1
- Current prompt template files with bash script references

## Output Artifacts
- Updated `templates/assistant/commands/tasks/execute-task.md`
- Updated `templates/assistant/commands/tasks/execute-blueprint.md`
- Consistent Node.js script invocation across all templates

## Implementation Notes

<details>
<summary>Template Update Instructions</summary>

### Files to Update

**File 1: `templates/assistant/commands/tasks/execute-task.md`**

Update line 21:
```markdown
# Before
- Dependency checking script: `@templates/ai-task-manager/config/scripts/check-task-dependencies.sh`

# After
- Dependency checking script: `@templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`
```

Update line 128:
```bash
# Before
if ! @templates/ai-task-manager/config/scripts/check-task-dependencies.sh "$PLAN_ID" "$TASK_ID"; then

# After
if ! node @templates/ai-task-manager/config/scripts/check-task-dependencies.cjs "$PLAN_ID" "$TASK_ID"; then
```

**File 2: `templates/assistant/commands/tasks/execute-blueprint.md`**

Update line 40:
```bash
# Before
if ! @templates/ai-task-manager/config/scripts/check-task-dependencies.sh "$1" "$TASK_ID"; then

# After
if ! node @templates/ai-task-manager/config/scripts/check-task-dependencies.cjs "$1" "$TASK_ID"; then
```

### Verification Steps
1. Search entire codebase for any remaining `.sh` references: `grep -r "check-task-dependencies\.sh" .`
2. Verify all script calls use `node` prefix with `.js` extension
3. Confirm argument passing (`"$PLAN_ID" "$TASK_ID"`) remains unchanged
4. Test template markdown rendering still works correctly

### Important Notes
- Preserve all surrounding bash conditional logic (`if ! ... then`)
- Keep all error messages and context exactly the same
- Do not modify any other aspects of the prompt templates
- The script interface and arguments remain identical, only the execution method changes

</details>