---
name: st-execute-blueprint
description: Execute a Strikethroo plan blueprint for this repository. Use when the user asks to run, implement, or carry out a specific plan ID — discovers the local .ai/strikethroo root, resolves the plan, validates or auto-generates tasks and the execution blueprint, optionally creates a feature branch, runs phases with lifecycle hooks, enforces validation gates, appends an execution summary, and archives the completed plan. Do not use for generic development work outside Strikethroo.
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

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute a plan outside of a valid root.

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

### 3. Validate tasks and blueprint existence

Inspect the `taskCount` and `blueprintExists` values returned by the validation script.

### 4. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

- Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."
- Follow the `st-generate-tasks` skill for this plan ID. Execute its operating procedure in full, including running `POST_TASK_GENERATION_ALL.md` to produce the execution blueprint.
- After generation completes, re-run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` (and the other fields) to refresh the resolved paths and counts.

If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

### 5. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>`. The script creates a branch named after the plan and prints the branch name. Continue execution regardless of whether a branch is created (some projects may skip this step).

### 6. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document at the path returned by step 2.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.

### 7. Execute phases in order

Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

#### 7a. Phase pre-execution
Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

#### 7b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_EXECUTION.md` and execute its instructions before starting any implementation work.

Deploy all selected agents simultaneously using your internal Task tool. Each agent MUST:

1. Read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any implementation work.
2. Execute the task according to its requirements.
3. Monitor execution progress and capture outputs and artifacts.
4. Update task status in real-time.

Maximize parallelism within each phase. Run every task that is ready at the same time.

#### 7c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

#### 7d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.

### 8. Post-execution validation

Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

### 9. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. If none occurred, state "No significant issues encountered."
- **Necessary follow-ups**: any follow-up actions or optimizations

### 10. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure (including all tasks and subdirectories) to maintain referential integrity. If the move fails, log the error but do not fail the overall execution — the implementation work is complete.

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
