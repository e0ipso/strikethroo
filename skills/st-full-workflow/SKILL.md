---
name: st-full-workflow
description: Use when the user asks to run the complete end-to-end Strikethroo workflow for a work order in one shot in this repository — triggers include full workflow, end-to-end, plan and execute, do everything, run the whole strikethroo workflow. Do not use when the user wants only one stage (create a plan, generate tasks, or execute a blueprint); use the dedicated skill for that stage instead.
---

# st-full-workflow

Drive the complete end-to-end Strikethroo workflow from initial plan creation through final blueprint execution and archival.

## Critical Rule

Execute all three steps sequentially without waiting for user input between them. This is a fully automated orchestration workflow. Progress indicators are for user visibility only and do not pause execution.

## Inputs

The user supplies the work order conversationally.

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

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute the full workflow outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

#### 2. Load project context

Read `<root>/config/STRIKETHROO.md` for the directory structure conventions
this project uses. Read `<root>/config/hooks/PRE_PLAN.md` and execute the
instructions it contains before proceeding. Read
`<root>/config/templates/PLAN_TEMPLATE.md` so the plan you emit conforms
to its structure.

Also read `<root>/config/shared/anti-rationalization.md`. The steps below
require you to apply it.

#### 3. Analyze the work order

Identify:

- Objective and end goal.
- Scope and explicit boundaries.
- Success criteria.
- Dependencies, prerequisites, blockers.
- Technical requirements and constraints.

#### 4. Clarification loop

If any critical context is missing, ask the user targeted questions. Keep
looping until you have no further questions. Explicitly confirm whether
backwards compatibility is required. Never invent answers; never paper over
a missing answer.

If the user declines to clarify a blocking question, stop and report the
plan as needing clarification. Do not produce a partial plan.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "I can reasonably assume the answer." | An assumption is not an answer. Ask the question; never invent answers. |
| "Asking again is annoying." | A question the user can decline is recoverable; a silent wrong assumption is not. Ask. |
| "The user implied it, so it's settled." | An implication is not a confirmation. Surface it as a question and get an explicit answer. |

#### 5. Allocate the next plan ID

Run `scripts/get-next-plan-id.cjs` to obtain the next available plan ID.
Pass `<root>` as the first argument when invoking the script from a working
directory that is not inside the project, otherwise no argument is required.
The script prints a single integer.

Compute the zero-padded form for directory naming (`{padded-id}--{slug}`)
and use the unpadded integer in the plan frontmatter and the final summary.

#### 6. Emit the plan

Write the plan to:

```
<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md
```

The output must:

- Conform to `<root>/config/templates/PLAN_TEMPLATE.md`, including required
  YAML frontmatter fields (at minimum `id`, `summary`, `created`).
- Contain the standard sections from the template body.
- Use Markdown, not free-form prose.
- Avoid time estimates, task lists, or code samples — those belong to the
  later task-generation step.

The `<slug>` is derived from the plan summary: lowercase, alphanumeric and
hyphens only, collapsed, trimmed.

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

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. Passing a different field name prints that
field alone.

If the script exits non-zero, surface its stderr to the user and stop the
workflow.
Do not guess a different ID.

#### 2. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions for plans, tasks,
  and the archive layout.
- The plan body at the path returned by step 1 — this is the contract for
  what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — every task file you emit must
  conform to this template's frontmatter schema and section structure.
- `<root>/config/shared/anti-rationalization.md` — apply in step 3.

#### 3. Analyze and decompose the plan

Read the entire plan. Identify all concrete deliverables **explicitly stated**.
Decompose each deliverable into atomic tasks only when genuinely needed.

**Task minimization (mandatory):**

- Create only the minimum number of tasks necessary. Target a 20–30%
  reduction from comprehensive lists by questioning the necessity of each
  candidate.
- **Direct Implementation Only**: a task corresponds to an explicit
  requirement, not a "nice-to-have".
- **DRY Task Principle**: each task has a unique, non-overlapping purpose.
- **Question Everything**: for each task, ask "Is this absolutely necessary
  to meet the plan objectives?"
- **Avoid Gold-plating**: resist comprehensive features the plan does not
  require.

**Antipatterns to avoid:**

- Separating "error handling" from the main implementation when it can be
  inline.
- Splitting trivially small operations into multiple tasks (e.g. "validate
  input" + "process input" as separate units).
- Adding tasks for "future extensibility" or "best practices" the plan does
  not mention.
- Comprehensive test suites for trivial functionality.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "One extra task won't hurt." | It violates the 20–30% minimization target. Every task traces to an **explicitly stated** deliverable or it does not exist. |
| "This edge case deserves its own task." | Fold it into the task that owns the behavior. Do not split trivially small operations into separate units. |
| "I'll add a test suite to be safe." | Comprehensive tests for trivial functionality are gold-plating. Follow the test philosophy — meaningful tests only. |
| "Future extensibility justifies this task." | YAGNI. The plan does not mention it, so it is not a task. |

#### 4. Apply granularity and skill rules

Each task must be:

- **Single-purpose** — one clear deliverable.
- **Atomic** — cannot be meaningfully split further.
- **Skill-specific** — executable by an agent with 1–2 technical skills.
- **Verifiable** — has explicit acceptance criteria that include at least one
  concrete, runnable verification step (a command plus its expected output, or
  another observable signal). Never settle for a vague "works correctly".

Skill assignment (kebab-case, automatically inferred from the task's
technical requirements):

- 1 skill — single-domain task (e.g. `["css"]`, `["vitest"]`).
- 2 skills — complementary domains (e.g. `["api-endpoints", "database"]`,
  `["react-components", "vitest"]`).
- 3+ skills indicates the task should be broken down further.

#### 5. Test philosophy: "write a few tests, mostly integration"

When generating test tasks, keep this constraint:

**Definition.** Meaningful tests verify custom business logic, critical paths,
and edge cases specific to this application. Test *your* code, not the
framework or library.

Before writing any test task, read `references/test-philosophy.md`; it lists
what deserves a test and what does not.

**Test task creation rules:**

- Combine related test scenarios into a single task (e.g. "Test user
  authentication flow" not separate tasks for login, logout, validation).
- Favor integration and critical-path coverage over per-method unit tests.
- Avoid one test task per CRUD operation.
- Question whether simple functions need a dedicated test task.

If any test task is generated, restate this section and the reference file
verbatim or near-verbatim in that task's "Implementation Notes" so the
executing agent applies them.

#### 6. Dependency analysis

For each task, identify:

- **Hard dependencies**: tasks that MUST complete before this one can start.
- **Soft dependencies**: tasks that SHOULD complete for optimal execution.

A task B depends on A if B requires A's output or artifacts, modifies code
created by A, or tests functionality implemented by A. Validate that the
final dependency graph is acyclic.

#### 7. Complexity analysis

For every candidate task, assign a `complexity_score` (integer 1–10) before
writing any file. Read `references/complexity-rubric.md` before scoring; it
defines the four dimensions each band is judged on.

**Pre-emission sanity rules** — apply these before any task is written:

- 3+ skills assigned → split the task into smaller tasks, each with 1–2 skills.
- Vague acceptance criteria → sharpen them until they include at least one
  concrete, runnable verification step.
- Trivially small adjacent tasks → merge them into a single task.
- Score ≥ 8 → decompose further; do not emit as-is.
- Score 6–7 → either sharpen criteria or split; do not emit without an
  explicit reason.

**Loop-back rule:**

After applying split, sharpen, or merge, re-run dependency analysis and
re-score the adjusted tasks. Repeat this loop no more than three times. If
complexity is still unresolved after three passes, stop and surface the
blocker to the user.

#### 8. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` to obtain the first available
task ID. Allocate subsequent IDs by incrementing in-process; do not invoke
the script repeatedly. Use the unpadded integer in the task frontmatter `id`
field and the zero-padded form (`{padded-id}--{slug}`) for the filename.

The slug derives from a short task title: lowercase, alphanumeric and
hyphens only, collapsed, trimmed.

#### 9. Emit the task files

Write each task to:

```
<root>/plans/<plan-dir-name>/tasks/{padded-id}--{slug}.md
```

Each file must conform to `<root>/config/templates/TASK_TEMPLATE.md`. Read
`references/task-frontmatter.md` when filling the frontmatter; it lists every
field, its type, and when the optional ones apply.

The body sections (Objective, Skills Required, Acceptance Criteria, Technical
Requirements, Input Dependencies, Output Artifacts, Implementation Notes)
must be filled with task-specific content. Place detailed implementation
guidance inside a `<details>` block under "Implementation Notes" — write it
so a non-thinking LLM could execute the task from that section alone.

#### 10. Validation checklist

Before declaring task generation complete, verify:

- Each task has 1–2 appropriate technical skills assigned and inferred from
  its objectives.
- Dependencies form an acyclic graph; no orphan or circular references.
- Task IDs are unique, sequential, and start from the value returned by
  `get-next-task-id.cjs`.
- Groups are consistent and meaningful.
- Every task's Acceptance Criteria includes at least one concrete, runnable
  verification step (command + expected output / observable signal), not a
  vague "works correctly".
- Every **explicitly stated** deliverable in the plan is covered.
- No redundant or overlapping tasks.
- Minimization applied (20–30% reduction target).
- Test tasks focus on business logic, not framework functionality.
- No gold-plating: only plan requirements are addressed.
- After writing the task files, run
  `scripts/validate-plan-blueprint.cjs <plan-id> complexityScoresValid`. Stop
  unless it prints `yes`; if it prints `no`, run
  `scripts/validate-plan-blueprint.cjs <plan-id> invalidComplexityTasks` to see
  which files are missing, non-integer, or out-of-range, fix them, and re-run.

#### 11. Route task execution

Read `<root>/config/hooks/TASK_EXECUTION_ROUTING.md` and follow its
instructions together with this procedure:

1. Run `scripts/route-task-execution.cjs profiles <plan-id>` and interpret
   its JSON result. On `no-config` or `disabled`, routing is off: skip the
   remaining routing steps and continue. On `invalid-config`, stop and
   surface the errors to the user — do not generate the blueprint.
2. Classify every task in the plan's `tasks/` directory against the
   configured profile descriptions. For tasks generated in this run, use the
   task content already in your context — objective, acceptance criteria,
   technical requirements, `skills`, and `complexity_score`; do not reread
   the emitted task files to reconstruct information you already hold. If
   the plan carried task files from an earlier generation run, read those
   files (and only those) to classify them — the mapping must cover every
   task in the plan. Assign each task ID exactly one configured profile
   name. Never invent a profile name, model, or harness.
3. Write the complete task-ID-to-profile mapping as a JSON object to a
   temporary file, for example `{"1": "routine", "2": "demanding"}`.
4. Run
   `scripts/route-task-execution.cjs apply <plan-id> <mapping-file>`. The
   helper validates the mapping (every task exactly once, only configured
   profiles), writes one `execution_profile` frontmatter field per task, and
   verifies the written files. Target selection and resolver execution happen
   later at task dispatch, never during generation.
5. On `routed`, delete the temporary mapping file and continue. On any
   failure result (`invalid-assignments`, `invalid-tasks`,
   `routing-failure`, `infrastructure-failure`), stop
   and surface the JSON errors to the user. Never proceed to blueprint
   generation with partially routed tasks.

Profile names are durable routing labels. Persist them only through the
helper's `execution_profile` field; never hand-write a concrete `execution`
target into task frontmatter or task bodies.

#### 12. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its
instructions. Run it only after routing succeeded or reported routing off.
This typically requires:

- Appending an Execution Blueprint section to the plan document, including a
  Mermaid dependency diagram and explicit phase groupings (Phase 1 contains
  zero-dependency tasks; each subsequent phase contains tasks whose
  dependencies all live in earlier phases). Use
  `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for structure.

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

#### 1. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. Passing a different field name prints that
field alone.

If the script exits non-zero, surface its stderr to the user and stop the
workflow.
Do not guess a different ID.

Run `scripts/validate-plan-blueprint.cjs <plan-id> planDir` and treat the
printed path as `<plan-dir>`.

#### 2. Validate tasks and blueprint existence

Run `scripts/validate-plan-blueprint.cjs <plan-id> taskCount` and
`scripts/validate-plan-blueprint.cjs <plan-id> blueprintExists`.

#### 3. Auto-generate tasks and blueprint if missing

If `taskCount` is 0 or `blueprintExists` is `no`:

- Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."
- Execute the full task generation procedure from Step 2 for this plan ID.
- After generation completes, re-run the `planFile`, `planDir`, `taskCount`, and `blueprintExists` queries to refresh the resolved paths and counts.

If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

#### 4. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. Branch creation is best-effort: when the script reports that it skipped creation (for example, not on `main`/`master`), continue on the current branch and do not retry or create a branch manually. Uncommitted or untracked changes are permitted only when every change is inside the repository-root `.ai/strikethroo` subtree. When the script exits with an error—including changes anywhere outside that subtree or an inability to inspect Git status on `main`/`master`—halt and report the error. Do not treat a skipped branch as a failure or spend effort working around a skip.

After the branch step, run `scripts/capture-base-commit.cjs <plan-id>` once. It records the commit the review gate diffs against. A `skipped` result is not a failure — continue execution and note that the review gate will skip. Only an `error` result halts.

#### 5. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document at the path returned by step 1.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md` — apply in the phase loop below.

#### 6. Execute phases in order

Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

##### 6a. Phase pre-execution
Run `scripts/check-phase-readiness.cjs <plan-id> <phase-number>`. If the script exits non-zero, halt the phase and report the blocking issues before continuing.

Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

##### 6b. Task dispatch
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

##### 6c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete. Do not mark a phase complete on an unverified claim.

##### 6d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "The subagent reported success, so the task is done." | A report is a claim, not evidence. Apply the verification gate before marking the phase complete. |
| "The tests probably pass." | "Probably" is a red flag. Run the proving command, read its output and exit code, then state the result. |
| "I'll verify later, after the next phase." | A phase is not complete until `POST_PHASE.md` succeeds against verified evidence. Verify now; do not advance on an unverified phase. |

#### 7. Post-execution validation

Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate in `<root>/config/shared/verification-gate.md` to the plan's Success Criteria and Self Validation steps.

##### Run the code review gate

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

#### 8. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. Always record the review gate's outcome here: the gate's JSON line verbatim, then which findings you acted on versus ignored and why. If nothing else occurred, state "No significant issues encountered." after the review outcome.
- **Necessary follow-ups**: any follow-up actions or optimizations

#### 9. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure, including all tasks and subdirectories. If the move fails, log the error but do not fail the overall execution.

**Progress**: `⬛⬛⬛ 100% - Step 3/3: Blueprint Execution Complete`

## Failure Modes

- **Plan directory already exists for the allocated ID in Step 1.** Re-run the next-plan-id script and retry once. If the conflict persists, stop and report.
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
