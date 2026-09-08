---
name: st-full-workflow
description: Use when the user asks to run the complete end-to-end Strikethroo workflow for a work order in one shot in this repository — triggers include full workflow, end-to-end, plan and execute, do everything, run the whole strikethroo workflow. Do not use when the user wants only one stage (create a plan, generate tasks, or execute a blueprint); use the dedicated skill for that stage instead.
---

# st-full-workflow

## Critical Rule

Execute all three steps sequentially without waiting for user input between them.

## Inputs

The user supplies the work order conversationally.

## Operating Procedure

### Step 1: Plan Creation

#### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory. If
it exits non-zero, stop and ask the user to run `npx strikethroo init`.

Treat the path it prints as `<root>` for every subsequent step.

Delegated execution workers skip this step and do not emit update notices.

Run `scripts/check-for-updates.cjs "<root>"` as a separate command using this
skill's script path. Keep the user's working directory. Read the one JSON line
on stdout. When `notice` is present, retain its exact text for the final
user-facing response. Never pause for permission and never run an update.

#### 2. Load project context

Read `<root>/config/STRIKETHROO.md` for this project's directory conventions.
Read `<root>/config/hooks/PRE_PLAN.md` and execute its instructions before
proceeding. Read `<root>/config/templates/PLAN_TEMPLATE.md`; the plan must
conform to it.

Also read `<root>/config/shared/anti-rationalization.md`.

#### 3. Analyze the work order

Identify:

- Objective.
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

Run `scripts/get-next-plan-id.cjs` for the next available plan ID. Compute its
zero-padded form for the directory name (`{padded-id}--{slug}`) and use the
unpadded integer in the plan frontmatter.

#### 6. Emit the plan

Write the plan to
`<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md`, conforming to
`<root>/config/templates/PLAN_TEMPLATE.md` in both frontmatter and sections.
Include no time estimates, task lists, or code samples; those belong to the
task-generation step.

Derive `<slug>` from the plan summary: lowercase, alphanumeric and hyphens
only, collapsed, trimmed.

#### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md`.

#### 8. Emit the Step 1 structured summary

Conclude Step 1 with exactly this block (a retained update notice, when present, follows after the workflow's final summary):

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

Parse the `Plan ID` value from this output and pass it to Step 2.



### Step 2: Task Generation

Using the plan ID from Step 1:



#### 1. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` for the plan
file's absolute path. Another field name prints that field instead.

If the script exits non-zero, surface its stderr to the user and stop the
workflow.
Do not guess a different ID.

#### 2. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — project and directory conventions.
- The plan body at the path returned by step 1 — the contract for
  what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — the schema every task file
  must match.
- `<root>/config/shared/anti-rationalization.md` — apply in step 3.

#### 3. Analyze and decompose the plan

Read the entire plan. Identify all concrete deliverables **explicitly stated**.
Decompose each deliverable into atomic tasks only when genuinely needed.

**Task minimization (mandatory):**

- Create only the minimum number of tasks necessary. Target a 20–30%
  reduction from comprehensive lists by questioning the necessity of each
  candidate.
- Every task corresponds to an explicit requirement, never a nice-to-have, a
  "best practice", or future extensibility the plan does not mention.
- Each task has a unique, non-overlapping purpose.
- Keep error handling inside the task that owns the behavior it guards.

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

Infer skills in kebab-case from the task's technical requirements. Use one
skill for a single-domain task and two for complementary domains, such as
`["api-endpoints", "database"]`. Three or more means the task must be broken
down further.

#### 5. Test philosophy: "write a few tests, mostly integration"

**Write tests for:**

- Custom business logic and algorithms.
- Critical user workflows and data transformations.
- Edge cases and error conditions in core functionality.
- Integration points between components.
- Complex validation or calculation logic.

**Do not write tests for:**

- Third-party library and framework functionality.
- Simple CRUD without custom logic.
- Trivial getters/setters and static configuration.
- Obvious functionality that would break immediately if incorrect.

Combine related test scenarios into one task ("Test user authentication flow",
not separate tasks for login, logout, and validation). Favor integration and
critical-path coverage over per-method unit tests. Never create one test task
per CRUD operation.

Copy these rules into the "Implementation Notes" of every test task you
generate.

#### 6. Dependency analysis

Task B depends on task A when B requires A's output or artifacts, modifies
code created by A, or tests functionality implemented by A. Record it as a
**hard dependency** when B cannot start before A completes and as a **soft
dependency** when B merely runs better after A. Validate that the final
dependency graph is acyclic.

#### 7. Complexity analysis

For every candidate task, assign a `complexity_score` (integer 1–10) before
writing any file. Read `references/complexity-rubric.md` before scoring; it
defines the four dimensions each band is judged on. Then apply these rules:

- Score ≥ 8 → decompose further; do not emit as-is.
- Score 6–7 → sharpen or split; do not emit without an explicit reason.
- Vague acceptance criteria → sharpen them into a concrete, runnable
  verification step.
- Trivially small adjacent tasks → merge them.

**Loop-back rule:** after applying split, sharpen, or merge, re-run dependency
analysis and re-score the adjusted tasks. Repeat no more than three times. If
complexity is still unresolved after three passes, stop and surface the
blocker to the user.

#### 8. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` once for the first available task
ID, then allocate the rest by incrementing in-process. Use the unpadded
integer in the task frontmatter `id` field and the zero-padded form in the
filename. The slug derives from a short task title: lowercase, alphanumeric
and hyphens only, collapsed, trimmed.

#### 9. Emit the task files

Write each task to:

```
<root>/plans/<plan-dir-name>/tasks/{padded-id}--{slug}.md
```

Each file must conform to `<root>/config/templates/TASK_TEMPLATE.md`. Add
`complexity_notes` only when the score needs justification. Never write
`execution_profile`; the routing helper writes it.

Fill every body section with task-specific content. Place detailed
implementation guidance inside a `<details>` block under "Implementation
Notes", written so a non-thinking LLM could execute the task from that
section alone.

#### 10. Validation checklist

Before declaring task generation complete, verify:

- Every **explicitly stated** deliverable in the plan is covered by a task.
- No two tasks overlap in purpose.
- Dependencies form an acyclic graph, with no orphan or circular references.
- Groups are consistent across the plan.
- After writing the task files, run
  `scripts/validate-plan-blueprint.cjs <plan-id> complexityScoresValid`. Stop
  unless it prints `yes`; if it prints `no`, run
  `scripts/validate-plan-blueprint.cjs <plan-id> invalidComplexityTasks` to see
  which files are missing, non-integer, or out-of-range, fix them, and re-run.

#### 11. Route task execution

Read `<root>/config/hooks/TASK_EXECUTION_ROUTING.md` and follow its
instructions together with this procedure:

1. Run `scripts/route-task-execution.cjs profiles <plan-id>`. On `no-config`
   or `disabled`, routing is off; skip the remaining routing steps and
   continue. On `invalid-config`, stop and surface the errors to the user; do
   not generate the blueprint.
2. Assign every task in the plan's `tasks/` directory exactly one configured
   profile name. Classify the tasks generated in this run from the content
   already in your context. If the plan carried task files from an earlier
   generation run, read those files to classify them.
3. Write the complete task-ID-to-profile mapping as a JSON object to a
   temporary file, for example `{"1": "routine", "2": "demanding"}`.
4. Run `scripts/route-task-execution.cjs apply <plan-id> <mapping-file>`.
   Target selection happens later at task dispatch, never during generation.
5. On `routed`, delete the temporary mapping file and continue. On any failure
   result (`invalid-assignments`, `invalid-tasks`, `routing-failure`,
   `infrastructure-failure`), stop and surface the JSON errors to the user.
   Never continue to blueprint generation with partially routed tasks.

Never hand-write a concrete execution target into task frontmatter or task
bodies.

#### 12. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its
instructions, using `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for the
Execution Blueprint structure. Run the hook only after routing succeeded or
reported routing off.

### Step 3: Blueprint Execution

Using the plan ID from Step 1:



#### 1. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` for the plan
file's absolute path. Another field name prints that field instead.

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

Notify the user: "Tasks or execution blueprint not found. Generating tasks automatically..."

- Execute the full task generation procedure from Step 2 for this plan ID.
- Re-run the `planFile`, `planDir`, `taskCount`, and `blueprintExists` queries to refresh the resolved paths and counts.

If the plan still has no tasks or no blueprint, stop and report failure.

#### 4. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>` once before phase execution. A skip is not a failure. Continue on the current branch, and never create the branch by hand. Uncommitted or untracked changes are permitted only inside the repository-root `.ai/strikethroo` subtree. An error result halts execution; report it.

Then run `scripts/capture-base-commit.cjs <plan-id>` once to record the commit the review gate diffs against. A `skipped` result continues execution and means the review gate will skip. Only an `error` result halts.

#### 5. Load project context and execution blueprint

Read these files, in order:

- `<root>/config/STRIKETHROO.md`
- The plan document at the path from step 1, including its Execution Blueprint section, which defines the phase groupings and task dispatch order.
- `<root>/config/shared/verification-gate.md` and `<root>/config/shared/anti-rationalization.md`, both applied in the phase loop below.

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

##### 6c. Phase completion verification
Ensure every task in the phase has status `completed` and collect its outputs. Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete.

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

#### 8. Append execution summary

Append an execution summary section to the plan document, filling every field of `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Under Noteworthy Events, always record the review gate's JSON line verbatim, then which findings you acted on versus ignored and why.

#### 9. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`, preserving the entire folder structure. If the move fails, log the error but do not fail the overall execution.

## Failure Modes

- **Plan directory already exists for the allocated ID in Step 1.** Re-run the next-plan-id script and retry once. If the conflict persists, stop and report.
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
