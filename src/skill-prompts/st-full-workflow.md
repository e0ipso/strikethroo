---
name: st-full-workflow
description: "Use when the user asks to run the complete end-to-end Strikethroo workflow for a work order in one shot in this repository — triggers include full workflow, end-to-end, plan and execute, do everything, run the whole strikethroo workflow. Do not use when the user wants only one stage (create a plan, generate tasks, or execute a blueprint); use the dedicated skill for that stage instead."
target: st-full-workflow
vars:
  action_verb_phrase: "execute the full workflow"
  heading: "#####"
  heading_parent: "####"
  phase_step: "5"
  summary_step: "7"
  archive_step: "8"
---

# st-full-workflow

Drive the complete end-to-end Strikethroo workflow from initial plan creation through final blueprint execution and archival. The skill is assistant-agnostic and self-contained: every script it invokes lives under this skill's `scripts/` directory and is referenced by relative path.

## Critical Rule

Execute all three steps sequentially without waiting for user input between them. This is a fully automated orchestration workflow. Progress indicators are for user visibility only and do not pause execution.

## Inputs

The user supplies the work order conversationally. Treat it as the only authoritative source of intent. Do not invent answers to clarifying questions — prompt the user instead.

## Context Passing Between Steps

Information flows through the workflow via structured output parsing:

1. **Step 1 → Step 2**: Extract the numeric `Plan ID` from the Step 1 structured summary output. Use this exact ID to drive Step 2.
2. **Step 2 → Step 3**: Extract the `Tasks` count from the Step 2 structured summary output. Use this count for progress tracking during Step 3.

Do not proceed to the next step until the structured output from the current step has been successfully parsed.

## Progress Indicators

Display progress indicators at key transition points to provide visual feedback without interrupting execution:

- `⬛⬜⬜ 33%` — Step 1: Plan Creation Complete
- `⬛⬛⬜ 66%` — Step 2: Task Generation Complete
- `⬛⬛⬛ 100%` — Step 3: Blueprint Execution Complete

These indicators are purely informational. Do not pause or wait for user input when displaying them.

## Operating Procedure

### Step 1: Plan Creation

**Progress**: `⬛⬜⬜ 33% - Step 1/3: Starting Plan Creation`

#### 1. Locate the strikethroo root

{{include sections/root-discovery.md}}

#### 2. Load project context

Read `<root>/config/STRIKETHROO.md` for directory structure conventions. Read `<root>/config/hooks/PRE_PLAN.md` and execute its instructions before proceeding. Read `<root>/config/templates/PLAN_TEMPLATE.md` so the plan conforms to the project's template.

#### 3. Analyze the work order

Identify:

- Objective and end goal.
- Scope and explicit boundaries.
- Success criteria.
- Dependencies, prerequisites, and blockers.
- Technical requirements and constraints.

#### 4. Clarification loop

If any critical context is missing, ask the user targeted questions. Loop until no further questions remain. Explicitly confirm whether backwards compatibility is required. Never invent answers.

If the user declines to clarify a blocking question, stop and report the plan as needing clarification. Do not produce a partial plan.

#### 5. Allocate the next plan ID

Run `scripts/get-next-plan-id.cjs` to obtain the next available plan ID. The script prints a single integer.

Compute the zero-padded form for directory naming (`{padded-id}--{slug}`) and use the unpadded integer in the plan frontmatter and the final summary.

#### 6. Emit the plan

Write the plan to:

```
<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md
```

The output must conform to `<root>/config/templates/PLAN_TEMPLATE.md`, including required YAML frontmatter fields (`id`, `summary`, `created`). Avoid time estimates, task lists, or code samples — those belong to the later task-generation step.

The `<slug>` is derived from the plan summary: lowercase, alphanumeric and hyphens only, collapsed, trimmed.

#### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md` after the plan file is written.

#### 8. Emit the Step 1 structured summary

Conclude Step 1 with exactly this block:

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

Parse the `Plan ID` value from this output and pass it to Step 2.

**Progress**: `⬛⬜⬜ 33% - Step 1/3: Plan Creation Complete`

---

### Step 2: Task Generation

**Progress**: `⬛⬜⬜ 33% - Step 2/3: Starting Task Generation`

Using the Plan ID extracted from Step 1:

#### 1. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the absolute path of the plan file. If the script exits non-zero, stop and report the error. Do not guess a different ID.

#### 2. Load project context

Read these files in order:

- `<root>/config/STRIKETHROO.md` — directory conventions.
- The plan body at the path returned above — this is the contract for what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — every task file must conform to this template.

#### 3. Analyze and decompose the plan

{{include sections/task-minimization.md}}

#### 4. Apply granularity and skill rules

{{include sections/granularity-skill-rules.md}}

#### 5. Test philosophy: "write a few tests, mostly integration"

{{include sections/test-philosophy.md}}

#### 6. Dependency analysis

For each task, identify:

- Hard dependencies — tasks that MUST complete before this one can start.
- Soft dependencies — tasks that SHOULD complete for optimal execution.

A task B depends on A if B requires A's output or artifacts, modifies code created by A, or tests functionality implemented by A. Validate that the final dependency graph is acyclic.

#### 7. Complexity analysis

{{include sections/task-complexity-analysis.md}}

#### 8. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` to obtain the first available task ID. Allocate subsequent IDs by incrementing in-process. Use the unpadded integer in the task frontmatter `id` field and the zero-padded form (`{padded-id}--{slug}`) for the filename.

The slug derives from a short task title: lowercase, alphanumeric and hyphens only, collapsed, trimmed.

#### 9. Emit the task files

{{include sections/task-file-output.md}}

#### 10. Validation checklist

{{include sections/validation-checklist.md}}

#### 11. Route task execution

{{include sections/task-execution-routing.md}}

#### 12. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its instructions. Run it only after routing succeeded or reported routing off. This typically requires:

- Appending an Execution Blueprint section to the plan document, including a Mermaid dependency diagram and explicit phase groupings.
- Use `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for structure.

#### 13. Emit the Step 2 structured summary

Conclude Step 2 with exactly this block:

```
---
Task Generation Summary:
- Plan ID: [numeric-id]
- Tasks: [count]
- Status: Ready for execution
```

Parse the `Tasks` count from this output and pass it to Step 3 for progress tracking.

**Progress**: `⬛⬛⬜ 66% - Step 2/3: Task Generation Complete`

---

### Step 3: Blueprint Execution

**Progress**: `⬛⬛⬜ 66% - Step 3/3: Starting Blueprint Execution`

Using the Plan ID from the previous phases:

#### 1. Resolve the plan and validate readiness

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the plan file path. Also query:

- `planDir` — absolute path of the plan directory
- `taskCount` — number of existing task files
- `blueprintExists` — `yes` or `no`

If the script exits non-zero, stop and report the error.

#### 2. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

- Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."
- Execute the full task generation procedure from Step 2 for this plan ID.
- After generation completes, re-run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` (and the other fields) to refresh the resolved paths and counts.
- If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

#### 3. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. Branch creation is best-effort: when the script reports that it skipped creation (for example, not on `main`/`master`), continue on the current branch and do not retry or create a branch manually. Uncommitted or untracked changes confined to `.ai/strikethroo` are permitted so a newly generated plan and tasks can remain uncommitted before execution. When the script exits with an error (for example, changes outside `.ai/strikethroo` on `main`/`master`), halt and report the error. Do not treat a skipped branch as a failure or spend effort working around a skip.

#### 4. Load execution blueprint

Read these files in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` — apply in the phase loop below.

#### 5. Execute phases in order

{{include sections/phase-execution-loop.md}}

#### 6. Post-execution validation

{{include sections/post-execution-archive.md}}

**Progress**: `⬛⬛⬛ 100% - Step 3/3: Blueprint Execution Complete`

## Failure Modes

- **No strikethroo root found.** Stop and instruct the user to initialize the project. Do not write any files or execute any tasks.
- **User refuses to answer a clarifying question that blocks planning in Step 1.** Report `needs-clarification` and stop. Do not produce a partial plan.
- **Plan ID script fails.** Re-check the resolved root and re-run. If it continues to fail, surface stderr to the user and stop — do not guess an ID.
- **Plan directory already exists for the allocated ID in Step 1.** Re-run the next-plan-id script and retry once. If the conflict persists, stop and report.
- **Plan ID does not resolve in Step 2 or 3.** Stop and surface the script's stderr. Do not guess a different ID.
- **Execution routing fails in Step 2.** Surface the routing helper's JSON errors and stop before blueprint generation. Do not guess profile assignments, hand-write `execution_profile`, or continue with partially routed tasks.
- **Missing blueprint after auto-generation in Step 3.** If automatic task generation fails to produce tasks or a blueprint, stop and report failure. Do not attempt execution without a blueprint.
- **Hook failure during execution.** If `PRE_PHASE.md`, `POST_PHASE.md`, or `POST_EXECUTION.md` fails, halt execution. The plan remains in `plans/` for debugging and potential re-execution.
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
