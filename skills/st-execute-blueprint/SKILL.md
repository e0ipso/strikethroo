---
name: st-execute-blueprint
description: Use when the user asks to run, execute, or implement a Strikethroo plan or blueprint by plan ID. Do not use to run a single task.
---

# st-execute-blueprint

## Inputs

The user supplies the numeric plan ID conversationally.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory. If
it exits non-zero, stop and ask the user to run `npx strikethroo init`.

Treat the path it prints as `<root>` for every subsequent step.

### 2. Validate the plan and the tasks

1. Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` for the plan
   file's absolute path.
   If the script exits non-zero, stop and ask the user to confirm the plan ID.
2. Run `scripts/validate-plan-blueprint.cjs <plan-id> planDir` and treat the
   printed path as `<plan-dir>`.
3. Run `scripts/validate-plan-blueprint.cjs <plan-id> taskCount` and
   `scripts/validate-plan-blueprint.cjs <plan-id> blueprintExists`.

### 3. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

Notify the user: "⚠️ Tasks or execution blueprint not found. Generating tasks automatically..."

- Follow the `st-generate-tasks` skill for this plan ID. Execute its operating procedure in full, including running `POST_TASK_GENERATION_ALL.md` to write the Execution Blueprint.
- Re-run the `planFile`, `planDir`, `taskCount`, and `blueprintExists` queries to refresh the resolved paths and counts.

If the plan still has no tasks or no blueprint, stop and report failure.

### 4. (Optional) Create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. If the script skips branch creation, continue on the current branch. Never create the branch by hand.

Uncommitted or untracked changes are permitted only inside the repository-root `.ai/strikethroo` subtree. When the script reports changes outside it, halt and offer the user these choices:

- Commit the changes on the current branch.
- Commit the changes on a temporary branch, then continue on this branch without them.
- Stash the changes.
- Discard the changes.

Apply the user's choice, then re-run the script. Any other error halts execution; report it.

Then run `scripts/capture-base-commit.cjs <plan-id>` once to record the commit the review gate diffs against. A `skipped` result continues execution and means the review gate will skip. Only an `error` result halts.

### 5. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md`
- The plan document at the path from step 2, including its Execution Blueprint section, which defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md`, both applied in the phase loop below.

### 6. Execute phases in order

Use an internal task or todo tracker to monitor progress. Track these steps for each phase defined in the Execution Blueprint:

- [ ] Phase pre-execution
- [ ] Task dispatch
- [ ] Phase completion verification
- [ ] Phase post-execution

#### 6a. Phase pre-execution
Run `scripts/check-phase-readiness.cjs <plan-id> <phase-number>`. If the script exits non-zero, halt the phase and report the blocking issues before continuing.

Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

#### 6b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. For each task, read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions for sub-agent selection before dispatching tasks.

Resolve every selected task's execution route first. Run the `resolve` command once per selected task, all in a single parallel tool operation:

```text
scripts/dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

Resolution does not execute a task. After interpreting all route results, issue
every external execution and every sub-agent **together in one parallel
tool operation**. External execution uses:

```text
scripts/dispatch-task-execution.cjs execute <handoff>
```

Where:

- `<current-harness>` is the exact supported harness identifier running this skill.
- `<workspace>` is the project working directory.

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
- Pass only the returned handoff to `execute`; it binds the task revision and configured invocation. Complete orchestrator status changes and assignment-hook edits before resolution. Task drift detected during execution preflight halts dispatch; workers may update status after launch. Never reuse a handoff for another task, and never rerun resolution after launches begin.

Deploy all remaining native sub-agents simultaneously. Each sub-agent must read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before any implementation work, then execute the task and update its status.

#### 6c. Phase completion verification
Ensure every task in the phase has status `completed` and collect its outputs. Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete.

#### 6d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Then update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "The subagent reported success, so the task is done." | A report is a claim, not evidence. Apply the verification gate before marking the phase complete. |
| "The tests probably pass." | "Probably" is a red flag. Run the proving command, read its output and exit code, then state the result. |
| "I'll verify later, after the next phase." | A phase is not complete until `POST_PHASE.md` succeeds against verified evidence. Verify now; do not advance on an unverified phase. |

### 7. Post-execution validation

Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If a validation gate fails, follow the hook's failure behavior, then re-run `POST_EXECUTION.md` in full. If the same gate fails again, halt execution and leave the plan in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate in `<root>/config/shared/verification-gate.md` to the plan's Success Criteria and Self Validation steps.

#### 7a. Run the code review gate

After `POST_EXECUTION.md` reports green, follow the `st-code-review` skill and run its bundled mechanism:

```text
code-review.cjs <plan-id> <current-harness>
```

Resolve `code-review.cjs` from the `st-code-review` skill's sibling `scripts` directory and pass the exact supported harness identifier running this skill. If the project is not a git repository or the `st-code-review` skill is not installed, skip the review, record why in the execution summary, and continue to summary and archival.

Handle the one JSON line it prints on stdout, in this order:

1. Copy it verbatim into the execution summary's review outcome. Do not reformat it or omit fields. Copy `codeReview` verbatim into the terminal Code Review entry.
2. Follow its top-level `action`. If it is `halt`, stop, report the top-level `detail`, and emit the terminal Execution Summary with the review result. If it is `continue`, proceed to the execution summary and archival.
3. Only when `verdict.kind` is `review-recorded`, read `<plan-dir>/review/review.xml` and `<plan-dir>/review/findings.json`, then decide which findings to act on. `severity` and `confidence` are advisory labels, not instructions.

Never report an uncertified review as clean.

Hard rules:

- The review runs once. Do not re-run the gate to check a fix unless the user explicitly asks for it.
- Detection uses the reviewer route. Dispatch each fix on the implementer route; the reviewer does not fix its findings.
- After any fix, the earlier green result no longer applies. Re-run `POST_EXECUTION.md` in full before declaring execution complete.

### 8. Append execution summary

Append an execution summary section to the plan document, filling every field of `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. If the code review ran, include a Code Review entry using the result’s `codeReview` field, or Failed with the reason no result was produced. Under Noteworthy Events, record the review gate's JSON line verbatim, then which findings you acted on versus ignored and why.

### 9. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`, preserving the entire folder structure.

## Failure Modes

- **Execution errors.** If a task fails, read `<root>/config/hooks/POST_ERROR_DETECTION.md`, document the error in Noteworthy Events, halt the phase, and request user direction before continuing.

## Execution Summary

Conclude with exactly this block (an update notice, when present, follows separately):

```
---
Execution Summary:
- Plan ID: [numeric-id]
- Status: [Archived or Halted]
- Location: [absolute path to current plan directory]
- Code Review: [codeReview from the review result, or Failed with the reason no result was produced]
---
```

Emit this block even when the review gate halts execution. Use the actual status and location; never claim archival after a halt. Copy `codeReview` without dropping the harness, model information, or rejection reasons. Findings acted on do not turn Address into Pass because the review is not re-run. If execution stops before review, report Failed with "Review was not run" and the blocking reason.

The summary is consumed by downstream automation; keep the format exact.

Before you write the final response, run `scripts/check-for-updates.cjs "<root>"`
as a separate command using this skill's script path. Keep the user's working
directory. Read the one JSON line on stdout.
Never pause for permission and never run an update.
When `notice` is present, append its exact text after the structured summary
block, or after your final response when this skill emits no summary block.
Nothing may follow the notice.
