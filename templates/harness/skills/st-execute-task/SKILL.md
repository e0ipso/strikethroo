---
name: st-execute-task
description: Execute a single task from a Strikethroo plan. Use when the user asks to run, implement, or carry out one specific task ID within a plan — discovers the local .ai/strikethroo root, resolves the plan, validates the task file, checks status and dependencies, runs pre-execution hooks, deploys an agent, updates status, documents noteworthy events, and emits a structured Task Execution Result. Do not use for generic development work outside Strikethroo.
---

# st-execute-task

Drive the execution of a single task within an existing Strikethroo plan.
The skill is assistant-agnostic and self-contained: every script it invokes
lives under this skill's `scripts/` directory and is referenced by relative
path.

## Critical Rules

1. **Never skip dependency validation** — task execution requires all dependencies to be completed.
2. **Validate task status** — never execute tasks that are already completed, in-progress, or needs-clarification.
3. **Maintain status integrity** — update task status throughout the execution lifecycle.
4. **Document execution** — record all outcomes and issues encountered.
5. **Provide structured output** — always emit the structured result block for orchestrator parsing.

## Inputs

The user supplies the numeric plan ID and task ID conversationally. Treat them
as the only authoritative source of intent. Do not invent answers to
clarifying questions — prompt the user instead.

## Failure Modes

- **No strikethroo root found.** Stop and instruct the user to initialize the
  project. Do not execute the task.
- **Plan ID does not resolve.** Stop and surface the script's stderr to the
  user. Do not guess a different ID.
- **Task file not found.** Stop and list available tasks in the plan to help
  the user identify the correct task ID.
- **Task status blocks execution.** If the task is `completed`,
  `in-progress`, or `needs-clarification`, halt and provide guidance on
  resolving the blocker.
- **Dependency validation failure.** If `scripts/check-task-dependencies.cjs`
  exits 1, stop and report unresolved dependencies. Do not proceed until they
  are satisfied.
- **Execution or hook failure.** If `PRE_TASK_EXECUTION.md`,
  `PRE_TASK_ASSIGNMENT.md`, or `POST_ERROR_DETECTION.md` fails, or the
  implementing agent encounters an unrecoverable error, set the task status
  to `failed`, document the error in Noteworthy Events, and emit the
  structured result with `Exit Code: 1`.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute a task outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

### 2. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. The same script also accepts these field
names (single-field output mode) and exposes them on demand:

- `planDir` — absolute path of the plan directory
- `taskCount` — number of existing task files in that plan's `tasks/`
- `blueprintExists` — `yes` or `no`
- `taskManagerRoot` — absolute path of `<root>`
- `planId` — the resolved numeric plan ID

If the script exits non-zero, stop and ask the user to confirm the plan ID.
Do not guess a different ID.

Treat the plan directory path returned by this script as `<plan-dir>`.

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

#### Valid Status Transitions

Reference for orchestrators and execution flow:

- `pending` → `in-progress` (execution starts)
- `in-progress` → `completed` (successful execution)
- `in-progress` → `failed` (execution error)
- `failed` → `in-progress` (retry attempt)
- `pending` → `needs-clarification` (set externally by orchestrator or reviewer)
- `needs-clarification` → `pending` (clarification resolved, set externally)

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

Deploy an agent using your internal Task tool. The agent MUST perform these
steps in order:

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
