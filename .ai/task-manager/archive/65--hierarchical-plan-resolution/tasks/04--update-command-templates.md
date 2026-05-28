---
id: 4
group: "Template Integration"
dependencies: [2]
status: "pending"
created: "2026-01-08"
skills: ["shell-scripting", "template-system"]
---

# Task 4: Update Command Templates to Use Root Discovery

## Objective

Update all command templates to use deterministic root discovery before invoking task manager scripts, ensuring correct behavior in nested project structures.

## Skills Required

- Shell scripting (bash)
- Template system understanding

## Acceptance Criteria

1. All 6 templates updated to follow two-step resolution pattern:
   - Step 1: Find closest task manager root
   - Step 2: Use absolute paths for subsequent script invocations
2. Templates updated:
   - `create-plan.md` - For plan ID generation
   - `generate-tasks.md` - For plan validation
   - `execute-blueprint.md` - For plan and task resolution
   - `refine-plan.md` - For plan discovery
   - `full-workflow.md` - For orchestrated operations
   - `execute-task.md` - For task resolution
3. All templates use `$TASK_MANAGER_SCRIPTS` variable pattern
4. Existing functionality preserved - no behavior changes except root resolution
5. Templates work correctly in nested directory structures
6. Backward compatibility maintained

## Technical Requirements

- Shell script integration with Node.js commands
- Proper variable substitution using root discovery output
- Error handling when root discovery fails
- Absolute path references for all script invocations
- Proper quoting and escaping for paths with spaces

## Input Dependencies

- Task 2: find-root.cjs script must exist
- Task 3: resolve-plan.cjs script must exist (for execute-blueprint, execute-task)

## Output Artifacts

- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/create-plan.md`
- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/generate-tasks.md`
- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/execute-blueprint.md`
- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/refine-plan.md`
- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/full-workflow.md`
- Updated `/workspace/templates/ai-task-manager/[assistant]/commands/tasks/execute-task.md`

## Implementation Notes

- Start with one template and establish the pattern
- Each template should follow identical root discovery approach
- The root discovery should happen before any script invocations that depend on it
- Handle case where root discovery fails (exit with error)
- Verify templates still work with existing test cases
- Test in nested project structure with multiple `.ai/task-manager` directories
- Templates should be compatible with all assistant types (Claude, Codex, Gemini, Cursor, GitHub, OpenCode)
