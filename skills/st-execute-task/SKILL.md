---
name: st-execute-task
description: Use when the user asks to run, execute, or implement one specific task ID within a Strikethroo plan in this repository — triggers include execute task, run task, implement task, do task N. Do not use to execute a whole plan or blueprint, to generate tasks, or for generic development outside Strikethroo.
---

# st-execute-task

## Critical Rules

1. **Maintain status integrity** — update task status throughout the execution lifecycle.
2. **Document execution** — record all outcomes and issues encountered.

## Inputs

The user supplies the numeric plan ID and task ID conversationally.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory. If
it exits non-zero, stop and ask the user to run `npx strikethroo init`.

Treat the path it prints as `<root>` for every subsequent step.

Delegated execution workers skip this step and do not emit update notices.

Run `scripts/check-for-updates.cjs "<root>"` as a separate command using this
skill's script path. Keep the user's working directory. Read the one JSON line
on stdout. When `notice` is present, retain its exact text for the final
user-facing response. Never pause for permission and never run an update.

### 2. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` for the plan
file's absolute path. Another field name prints that field instead.

If the script exits non-zero, stop and ask the user to confirm the plan ID.
Do not guess a different ID.

Run `scripts/validate-plan-blueprint.cjs <plan-id> planDir` and treat the
printed path as `<plan-dir>`.

### 3. Validate the task file

Look for `<plan-dir>/tasks/<task-id>--*.md`, then for the zero-padded
`<plan-dir>/tasks/0<task-id>--*.md`. If neither matches, list the files in
`<plan-dir>/tasks/` and stop. Treat the match as `<task-file>`.

### 4. Check task status

Read `status` from the `<task-file>` frontmatter.

- `completed`, `in-progress`, or `needs-clarification`: stop, and name the way
  out (re-execute a completed task through execute-blueprint, answer the open
  clarification questions first).
- `pending` or `failed`: execute.
- Missing or unrecognized: proceed with caution and note the ambiguity.

### 5. Validate dependencies

Run `scripts/check-task-dependencies.cjs <plan-id> <task-id>`. If it exits 1,
stop and report that unresolved dependencies block the task. Do not proceed
until they are satisfied.

### 6. Agent selection

Read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions
for selecting the appropriate agent or skill set for this task.

### 7. Update status to in-progress

Rewrite the YAML frontmatter of `<task-file>`, setting `status: "in-progress"`.
Preserve all other frontmatter fields exactly.

### 8. Execute the task

Resolve the route before deploying any agent; resolution launches no task
work:

```text
scripts/dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

External execution uses:

```text
scripts/dispatch-task-execution.cjs execute <handoff> <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

`<current-harness>` is the exact supported harness identifier running this
skill; `<workspace>` is the project working directory.

Interpret the one-line JSON result and act on its `kind` exactly once:

| `kind` | Required action |
| --- | --- |
| `native-default` | Dispatch natively with no execution-setting prose. |
| `native-override` | Dispatch natively, explicitly requiring the exact returned `model`. Require the returned `reasoningEffort` only when that property is present. |
| `external-override` | Run the `execute` command with the returned `handoff`, then read its result against this same table. |
| `fallback` | Nothing launched. Record the returned `reason` and `detail` visibly, then dispatch natively with no execution-setting prose. |
| `launched-success` | The external process exited zero. Do not dispatch natively; review status and evidence as you would for a native agent. |
| `launched-failure` | A failed task. Set its status to `failed` and run `<root>/config/hooks/POST_ERROR_DETECTION.md`. Never retry it natively. |
| `infrastructure-failure` | Handle exactly as the preceding row. |

Handoff rules:

- Pass the exact opaque `handoff` string the resolver returned for that task. Never reconstruct one.
- Never reuse a handoff for another task, and never rerun resolution after launches begin.

Steps 9–11 are this skill's failed-status and error-hook path.

For a native dispatch, deploy an agent using your internal Task tool. The agent
must read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before any
implementation work, then read the complete `<task-file>` and implement it.
Do not run `scripts/check-for-updates.cjs`; delegated workers do not consume update notices.

### 9. Update status to completed or failed

After the agent finishes, rewrite the YAML frontmatter of `<task-file>` based
on the outcome:

- Set `status: "completed"` if the task was implemented successfully and
  all acceptance criteria are met.
- Set `status: "failed"` if the task could not be completed, acceptance
  criteria were not met, or an unrecoverable error occurred.

Preserve all other frontmatter fields exactly.

### 10. Document noteworthy events

If anything significant occurred during execution — decisions made, issues
encountered, deviations from the plan, or follow-up actions required —
append a "Noteworthy Events" section to the end of `<task-file>`:

```markdown
## Noteworthy Events
- [YYYY-MM-DD] [Event description with sufficient context for the orchestrator]
```

### 11. Error handling

If any error occurred during execution, read
`<root>/config/hooks/POST_ERROR_DETECTION.md` and execute its instructions.
Document the error in Noteworthy Events and ensure the task status is set to
`failed` if it is not already.

When the retained update `notice` is present, append that exact sentence after
the structured summary block, or after your final response when this skill emits
no summary block. Nothing may follow the notice.

## Failure Modes

- **Execution errors.** If a task fails, read `<root>/config/hooks/POST_ERROR_DETECTION.md`, document the error in Noteworthy Events, and ensure the task status is set to `failed`.
