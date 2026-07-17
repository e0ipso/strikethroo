---
name: st-execute-blueprint
description: "Use when the user asks to run, execute, implement, or carry out a Strikethroo plan or its blueprint by plan ID in this repository — triggers include execute blueprint, run the plan, implement plan, build the plan. Do not use to create a plan, to only generate tasks, to run a single task, or for generic development outside Strikethroo."
target: st-execute-blueprint
vars:
  action_verb_phrase: "execute a plan"
  heading: "####"
  heading_parent: "###"
  phase_step: "7"
  summary_step: "9"
  archive_step: "10"
---

# st-execute-blueprint

Drive the end-to-end execution of an existing Strikethroo plan blueprint. The skill is assistant-agnostic and self-contained: every script it invokes lives under this skill's `scripts/` directory and is referenced by relative path.

## Critical Rules

1. **Never skip validation gates** — a phase is not complete until `POST_PHASE.md` succeeds.
2. **Preserve dependency order** — never execute a task before all of its dependencies are completed.
3. **Maximize parallelism within each phase** — run all tasks whose dependencies are satisfied simultaneously.
4. **Fail safely and document everything** — halt on unrecoverable errors, and record all decisions, issues, and outcomes under "Noteworthy Events" in the execution summary.

## Inputs

The user supplies the numeric plan ID conversationally. Treat it as the only authoritative source of intent. Do not invent answers to clarifying questions — prompt the user instead.

## Operating Procedure

### 1. Locate the strikethroo root

{{include sections/root-discovery.md}}

### 2. Resolve the plan

{{include sections/plan-resolution.md}}

### 3. Validate tasks and blueprint existence

Inspect the `taskCount` and `blueprintExists` values returned by the validation script.

### 4. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

- Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."
- Follow the `st-generate-tasks` skill for this plan ID. Execute its operating procedure in full, including running `POST_TASK_GENERATION_ALL.md` to write the Execution Blueprint.
- After generation completes, re-run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` (and the other fields) to refresh the resolved paths and counts.

If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

### 5. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. Branch creation is best-effort: when the script reports that it skipped creation (for example, not on `main`/`master`), continue on the current branch and do not retry or create a branch manually. Uncommitted or untracked changes confined to `.ai/strikethroo` are permitted so a newly generated plan and tasks can remain uncommitted before execution. When the script exits with an error (for example, changes outside `.ai/strikethroo` on `main`/`master`), halt and report the error. Do not treat a skipped branch as a failure or spend effort working around a skip.

### 6. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document at the path returned by step 2.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md` — apply in the phase loop below.

### 7. Execute phases in order

{{include sections/phase-execution-loop.md}}

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "The subagent reported success, so the task is done." | A report is a claim, not evidence. Apply the verification gate before marking the phase complete. |
| "The tests probably pass." | "Probably" is a red flag. Run the proving command, read its output and exit code, then state the result. |
| "I'll verify later, after the next phase." | A phase is not complete until `POST_PHASE.md` succeeds against verified evidence. Verify now; do not advance on an unverified phase. |

### 8. Post-execution validation

{{include sections/post-execution-archive.md}}

## Failure Modes

- **No strikethroo root found.** Stop and instruct the user to initialize the project. Do not execute any tasks.
- **Plan ID does not resolve.** Stop and surface the script's stderr to the user. Do not guess a different ID.
- **Missing blueprint after auto-generation.** If the `st-generate-tasks` skill fails to produce tasks or a blueprint, stop and report failure. Do not attempt execution without a blueprint.
- **Hook failure.** If `PRE_PHASE.md`, `POST_PHASE.md`, or `POST_EXECUTION.md` fails, halt execution. The plan remains in `plans/` for debugging and potential re-execution.
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
