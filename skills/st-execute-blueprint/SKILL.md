---
name: st-execute-blueprint
description: Use when the user asks to run, execute, implement, or carry out a Strikethroo plan or its blueprint by plan ID in this repository — triggers include execute blueprint, run the plan, implement plan, build the plan. Do not use to create a plan, to only generate tasks, to run a single task, or for generic development outside Strikethroo.
---

# st-execute-blueprint

## Inputs

The user supplies the numeric plan ID conversationally.

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

### 3. Validate tasks and blueprint existence

Run `scripts/validate-plan-blueprint.cjs <plan-id> taskCount` and
`scripts/validate-plan-blueprint.cjs <plan-id> blueprintExists`.

### 4. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."

- Follow the `st-generate-tasks` skill for this plan ID. Execute its operating procedure in full, including running `POST_TASK_GENERATION_ALL.md` to write the Execution Blueprint.
- Re-run the `planFile`, `planDir`, `taskCount`, and `blueprintExists` queries to refresh the resolved paths and counts.

If the plan still has no tasks or no blueprint, stop and report failure.

### 5. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. A skip is not a failure. Continue on the current branch, and never create the branch by hand. Uncommitted or untracked changes are permitted only inside the repository-root `.ai/strikethroo` subtree. An error result halts execution; report it.

Then run `scripts/capture-base-commit.cjs <plan-id>` once to record the commit the review gate diffs against. A `skipped` result continues execution and means the review gate will skip. Only an `error` result halts.

### 6. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md`
- The plan document at the path from step 2, including its Execution Blueprint section, which defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md`, both applied in the phase loop below.

### 7. Execute phases in order

Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

#### 7a. Phase pre-execution
Run `scripts/check-phase-readiness.cjs <plan-id> <phase-number>`. If the script exits non-zero, halt the phase and report the blocking issues before continuing.

Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

#### 7b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions for agent selection before dispatching tasks.

Resolve every selected task's execution route first. Invoke one resolver per selected
task simultaneously in a single parallel tool operation:

```text
scripts/dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

Resolvers never launch external processes. After interpreting all route results, issue
every external execution and every sub-agent **together in one parallel
tool operation**. External execution uses:

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

Deploy all remaining native sub-agents simultaneously. Each sub-agent must read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before any implementation work, then execute the task and update its status. Do not run `scripts/check-for-updates.cjs`; delegated workers do not consume update notices.

#### 7c. Phase completion verification
Ensure every task in the phase has status `completed` and collect its outputs. Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete.

#### 7d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "The subagent reported success, so the task is done." | A report is a claim, not evidence. Apply the verification gate before marking the phase complete. |
| "The tests probably pass." | "Probably" is a red flag. Run the proving command, read its output and exit code, then state the result. |
| "I'll verify later, after the next phase." | A phase is not complete until `POST_PHASE.md` succeeds against verified evidence. Verify now; do not advance on an unverified phase. |

### 8. Post-execution validation

Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate in `<root>/config/shared/verification-gate.md` to the plan's Success Criteria and Self Validation steps.

#### Run the code review gate

After `POST_EXECUTION.md` reports green, follow the `st-code-review` skill and run its bundled mechanism:

```text
code-review.cjs <plan-id> <current-harness>
```

Resolve `code-review.cjs` from the `st-code-review` skill's sibling `scripts` directory and pass the exact supported harness identifier running this skill. If the `st-code-review` skill is not installed, record that outcome in the execution summary and continue to summary and archival.

Handle the one JSON line it prints on stdout, in this order:

1. Copy it verbatim into the execution summary's review outcome. Do not reformat it or omit fields.
2. Follow its top-level `action`. If it is `halt`, stop and report the top-level `detail`. If it is `continue`, proceed to the execution summary and archival.
3. Only when `verdict.kind` is `review-recorded`, read `<plan-dir>/review/review.xml` and `<plan-dir>/review/findings.json`, then decide which findings to act on. `severity` and `confidence` are advisory labels, not instructions.

Never report an uncertified review as clean.

Hard rules:

- The review runs once. Do not re-run the gate to check a fix.
- Detection uses the reviewer route. Dispatch each fix on the implementer route; the reviewer does not fix its findings.
- After any fix, re-run `POST_EXECUTION.md` in full before declaring execution complete. The earlier green result no longer applies.

### 9. Append execution summary

Append an execution summary section to the plan document, filling every field of `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Under Noteworthy Events, always record the review gate's JSON line verbatim, then which findings you acted on versus ignored and why.

### 10. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`, preserving the entire folder structure. If the move fails, log the error but do not fail the overall execution.

## Failure Modes

- **Execution errors.** If a task fails, read `<root>/config/hooks/POST_ERROR_DETECTION.md`, document the error in Noteworthy Events, halt the phase, and request user direction before continuing.

## Execution Summary

Conclude with exactly this block (a retained update notice, when present, follows separately):

```
---
Execution Summary:
- Plan ID: [numeric-id]
- Status: Archived
- Location: [absolute path to archive directory]
---
```

The summary is consumed by downstream automation; keep the format exact.

When the retained update `notice` is present, append that exact sentence after
the structured summary block, or after your final response when this skill emits
no summary block. Nothing may follow the notice.
