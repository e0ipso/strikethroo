---
id: 2
group: "skill-artifact"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["technical-writing"]
status: "completed"
status: "completed"
---
# Author task-execute-task SKILL.md

## Objective

Create a standards-compliant Agent Skill at `templates/skills/task-execute-task/SKILL.md` that encodes the same single-task execution workflow as the existing `/tasks:execute-task` command. The skill must be assistant-agnostic, self-contained, and reference bundled scripts by relative path.

## Skills Required

- technical-writing (authoring skill prose, preserving command contract in skill format)

## Acceptance Criteria

- [ ] `templates/skills/task-execute-task/SKILL.md` exists with valid YAML frontmatter
- [ ] Frontmatter `name` equals `task-execute-task`
- [ ] Description is specific to single-task execution for this task-manager (not generic development)
- [ ] Operating procedure matches the execute-task command contract step-for-step
- [ ] All bundled script references use relative paths from the skill root (`scripts/<name>.cjs`)
- [ ] No assistant-specific syntax (`$ARGUMENTS`, `$1`) appears in the skill body
- [ ] Critical rules are preserved: never skip dependency validation, never execute completed/in-progress/needs-clarification tasks, maintain status integrity, document noteworthy events
- [ ] Ends with the exact `Task Execution Result` structured output block format

## Technical Requirements

- Follow the structure and tone of existing shipping skills (`task-execute-blueprint`, `task-refine-plan`, `task-create-plan`)
- The skill directory must be flat: no nested subdirectories except `scripts/`
- Script invocation examples must use relative paths so the skill works when copied standalone

## Input Dependencies

- Reference skill prose: `templates/skills/task-execute-blueprint/SKILL.md`
- Reference command contract: `templates/assistant/commands/tasks/execute-task.md`

## Output Artifacts

- `templates/skills/task-execute-task/SKILL.md`

## Implementation Notes

<details>

### Skill structure
Use this frontmatter:
```yaml
---
name: task-execute-task
description: Execute a single task from an AI Task Manager plan. Use when the user asks to run, implement, or carry out one specific task ID within a plan — discovers the local .ai/task-manager root, resolves the plan, validates the task file, checks status and dependencies, runs pre-execution hooks, deploys an agent, updates status, documents noteworthy events, and emits a structured Task Execution Result. Do not use for generic development work outside the AI Task Manager.
---
```

### Operating procedure sections
Mirror the execute-task command flow as skill prose:

1. **Locate the task-manager root** — run `scripts/find-task-manager-root.cjs`, treat printed path as `<root>`. Stop if non-zero.
2. **Resolve the plan** — run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to get the plan file path. Stop if non-zero.
3. **Validate the task file** — locate the specific task in `<plan-dir>/tasks/` using padded/unpadded ID matching.
4. **Check task status** — read frontmatter `status`. Block execution if `completed`, `in-progress`, or `needs-clarification`. Allow `pending` or `failed`.
5. **Validate dependencies** — run `scripts/check-task-dependencies.cjs <plan-id> <task-id>`. Stop if exits 1.
6. **Agent selection** — read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions.
7. **Update status to in-progress** — rewrite task frontmatter.
8. **Execute the task** — deploy an agent that reads `<root>/config/hooks/PRE_TASK_EXECUTION.md`, then implements the task.
9. **Update status to completed or failed** — rewrite task frontmatter based on outcome.
10. **Document noteworthy events** — append to task file if anything significant occurred.
11. **Error handling** — read `<root>/config/hooks/POST_ERROR_DETECTION.md`.
12. **Emit structured output** — end with the exact `Task Execution Result` block.

### Valid status transitions
Include a reference subsection:
- `pending` → `in-progress`
- `in-progress` → `completed`
- `in-progress` → `failed`
- `failed` → `in-progress`
- `pending` → `needs-clarification` (external)
- `needs-clarification` → `pending` (external)

### Failure modes
List the same failure modes as the command:
- No task-manager root found
- Plan ID does not resolve
- Task file not found
- Task status blocks execution
- Unresolved dependencies
- Hook failure

### Critical rules section
Copy the five critical rules from the command template into a "Critical Rules" section near the top of the skill body.

### Structured output format
End with exactly:
```
---
Task Execution Result:
- Plan ID: [numeric-id]
- Task ID: [numeric-id]
- Exit Code: [0 for success, 1 for failure]
```

</details>
