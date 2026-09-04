---
name: st-execute-task
description: Use when the user asks to run, execute, or implement one specific task ID within a Strikethroo plan in this repository — triggers include execute task, run task, implement task, do task N. Do not use to execute a whole plan or blueprint, to generate tasks, or for generic development outside Strikethroo.
---

# st-execute-task

Drive the execution of a single task within an existing Strikethroo plan.

## Critical Rules

1. **Never skip dependency validation** — task execution requires all dependencies to be completed.
2. **Validate task status** — never execute tasks that are already completed, in-progress, or needs-clarification.
3. **Maintain status integrity** — update task status throughout the execution lifecycle.
4. **Document execution** — record all outcomes and issues encountered.
5. **Provide structured output** — always emit the structured result block for orchestrator parsing.

## Inputs

The user supplies the numeric plan ID and task ID conversationally.

## Failure Modes

- **Execution or hook failure.** If `PRE_TASK_EXECUTION.md`,
  `PRE_TASK_ASSIGNMENT.md`, or `POST_ERROR_DETECTION.md` fails, or the
  implementing agent encounters an unrecoverable error, set the task status
  to `failed`, document the error in Noteworthy Events, and emit the
  structured result with `Exit Code: 1`.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute a task outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

### 2. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. Passing a different field name prints that
field alone.

If the script exits non-zero, stop and ask the user to confirm the plan ID.
Do not guess a different ID.

Run `scripts/validate-plan-blueprint.cjs <plan-id> planDir` and treat the
printed path as `<plan-dir>`.

### 3. Validate the task file

Locate the specific task file inside `<plan-dir>/tasks/`. Match using both
padded and unpadded forms of the task ID:

- First, look for `<plan-dir>/tasks/<task-id>--*.md`
- If not found, look for `<plan-dir>/tasks/0<task-id>--*.md`

If no file matches, stop and report that the task ID was not found in the
plan. List the available task files in `<plan-dir>/tasks/` to help the user
identify the correct ID.

Treat the resolved file path as `<task-file>`.

### 4. Check task status

Read the YAML frontmatter of `<task-file>` and extract the `status` field.

- Block execution if the status is `completed`, `in-progress`, or
  `needs-clarification`.
- Allow execution if the status is `pending` or `failed`.
- If the status is missing or unrecognized, proceed with caution and note
  the ambiguity.

If execution is blocked, stop and explain why, including guidance on how
to resolve the blocker (e.g., use execute-blueprint to re-execute a completed
task, or resolve clarification questions first).

### 5. Validate dependencies

Run `scripts/check-task-dependencies.cjs <plan-id> <task-id>`. The script
validates that every dependency declared in the task frontmatter has status
`completed`.

If the script exits 1, stop and report that the task is blocked by unresolved
dependencies. Do not proceed until dependencies are satisfied.

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
| `fallback` | Nothing launched. Record the returned `reason` and `detail` visibly, then dispatch natively with no execution-setting prose. Either command can return it. |
| `launched-success` | The external process exited zero. Do not dispatch natively; review status and evidence as you would for a native agent. |
| `launched-failure` | A failed task. Set its status to `failed` and run `<root>/config/hooks/POST_ERROR_DETECTION.md`. Never retry it natively. |
| `infrastructure-failure` | A failed task. Set its status to `failed` and run `<root>/config/hooks/POST_ERROR_DETECTION.md`. Never retry it natively. |

Handoff and exit rules:

- Pass the exact opaque `handoff` string the resolver returned for that task. Never reconstruct one.
- Never reuse a handoff for another task, and never rerun resolution after launches begin.
- `execute` validates the handoff and does not reread routing configuration.
- The command emits exactly one JSON line. Exit code `2` is an infrastructure failure; exit code `1` is a launched task failure.

Steps 9–11 are this skill's failed-status and error-hook path.

For a native dispatch, deploy an agent using your internal Task tool. The agent
MUST perform these steps in order:

1. **Pre-flight validation**: Read and execute
   `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any
   implementation work.
2. **Execute the task**: Read the complete `<task-file>` and implement
   according to its requirements, including:
   - Objective and acceptance criteria
   - Technical requirements and implementation notes
   - Input dependencies and expected output artifacts
3. **Monitor progress**: Capture outputs, artifacts, and any issues
   encountered during implementation.

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

If no noteworthy events occurred, do not add the section.

### 11. Error handling

If any error occurred during execution, read
`<root>/config/hooks/POST_ERROR_DETECTION.md` and execute its instructions.
Document the error in Noteworthy Events and ensure the task status is set to
`failed` if it is not already.

### 12. Emit structured output

End the session with exactly this block as the final output:

```
---
Task Execution Result:
- Plan ID: [numeric-id]
- Task ID: [numeric-id]
- Exit Code: [0 for success, 1 for failure]
```
