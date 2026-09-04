---
name: st-execute-blueprint
description: Use when the user asks to run, execute, implement, or carry out a Strikethroo plan or its blueprint by plan ID in this repository — triggers include execute blueprint, run the plan, implement plan, build the plan. Do not use to create a plan, to only generate tasks, to run a single task, or for generic development outside Strikethroo.
---

# st-execute-blueprint

Drive the end-to-end execution of an existing Strikethroo plan blueprint.

## Critical Rules

1. **Never skip validation gates** — a phase is not complete until `POST_PHASE.md` succeeds.
2. **Preserve dependency order** — never execute a task before all of its dependencies are completed.
3. **Maximize parallelism within each phase** — run all tasks whose dependencies are satisfied simultaneously.
4. **Fail safely and document everything** — halt on unrecoverable errors, and record all decisions, issues, and outcomes under "Noteworthy Events" in the execution summary.

## Inputs

The user supplies the numeric plan ID conversationally.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute a plan outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

### 2. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. Passing a different field name prints that
field alone.

If the script exits non-zero, stop and ask the user to confirm the plan ID.
Do not guess a different ID.

Run `scripts/validate-plan-blueprint.cjs <plan-id> planDir` and treat the
printed path as `<plan-dir>`.

### 3. Validate tasks and blueprint existence

Run `scripts/validate-plan-blueprint.cjs <plan-id> taskCount` and
`scripts/validate-plan-blueprint.cjs <plan-id> blueprintExists`.

### 4. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

- Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."
- Follow the `st-generate-tasks` skill for this plan ID. Execute its operating procedure in full, including running `POST_TASK_GENERATION_ALL.md` to write the Execution Blueprint.
- After generation completes, re-run the `planFile`, `planDir`, `taskCount`, and `blueprintExists` queries to refresh the resolved paths and counts.

If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

### 5. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. Branch creation is best-effort: when the script reports that it skipped creation (for example, not on `main`/`master`), continue on the current branch and do not retry or create a branch manually. Uncommitted or untracked changes are permitted only when every change is inside the repository-root `.ai/strikethroo` subtree. When the script exits with an error—including changes anywhere outside that subtree or an inability to inspect Git status on `main`/`master`—halt and report the error. Do not treat a skipped branch as a failure or spend effort working around a skip.

After the branch step, run `scripts/capture-base-commit.cjs <plan-id>` once. It records the commit the review gate diffs against. A `skipped` result is not a failure — continue execution and note that the review gate will skip. Only an `error` result halts.

### 6. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document at the path returned by step 2.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md` — apply in the phase loop below.

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
every external execution and every native Task-tool agent **together in one parallel
tool operation**. External execution uses:

```text
scripts/dispatch-task-execution.cjs execute <handoff> <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

This two-step protocol is mandatory: do not execute external tasks during route
resolution, do not serialize external commands, and do not wait for external completion
before launching ready native agents.

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

Deploy all remaining native agents simultaneously using your internal Task tool. Each agent MUST:

1. Read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any implementation work.
2. Execute the task according to its requirements.
3. Monitor execution progress and capture outputs and artifacts.
4. Update task status in real-time.

#### 7c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete. Do not mark a phase complete on an unverified claim.

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

Resolve `code-review.cjs` from the `st-code-review` skill's sibling `scripts` directory. Pass the exact supported harness identifier running this skill. The command emits exactly one JSON line on stdout; reviewer output goes to stderr.

If the `st-code-review` skill is not installed, record that outcome in the execution summary and continue to summary and archival.

Handle the JSON line in this order:

1. Copy it verbatim into the execution summary's review outcome. Do not reformat it or omit fields.
2. Follow its top-level `action`. If it is `halt`, stop and report the top-level `detail`; execution is incomplete. If it is `continue`, proceed to the execution summary and archival.
3. Only when `verdict.kind` is `review-recorded`, read `<plan-dir>/review/review.xml` and `<plan-dir>/review/findings.json`, then decide which findings to act on. `severity` and `confidence` are advisory labels, not instructions.

The compiled top-level `action` and exit status control the decision. Do not re-derive `action` from another field. Never report an uncertified review as clean.

Hard rules:

- The review runs once. Do not re-run the gate to check a fix.
- Detection uses the reviewer route. Dispatch each fix on the implementer route; the reviewer does not fix its findings.
- After any fix, re-run `POST_EXECUTION.md` in full before declaring execution complete. The earlier green result no longer applies.

### 9. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. Always record the review gate's outcome here: the gate's JSON line verbatim, then which findings you acted on versus ignored and why. If nothing else occurred, state "No significant issues encountered." after the review outcome.
- **Necessary follow-ups**: any follow-up actions or optimizations

### 10. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure, including all tasks and subdirectories. If the move fails, log the error but do not fail the overall execution.

## Failure Modes

- **Execution errors.** If a task fails, read `<root>/config/hooks/POST_ERROR_DETECTION.md`, document the error in Noteworthy Events, halt the phase, and request user direction before continuing.

## Execution Summary

Conclude with exactly this block as the final output:

```
---
Execution Summary:
- Plan ID: [numeric-id]
- Status: Archived
- Location: [absolute path to archive directory]
---
```

The summary is consumed by downstream automation; keep the format exact.
