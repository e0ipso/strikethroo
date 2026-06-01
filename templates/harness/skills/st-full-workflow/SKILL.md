---
name: st-full-workflow
description: Execute the complete Strikethroo workflow from plan creation through blueprint execution for this repository. Use when the user asks to run the full end-to-end workflow for a work order — discovers the local .ai/strikethroo root, creates a plan, generates atomic tasks, and executes the blueprint, all in a single uninterrupted sequence. Do not use for individual plan creation, task generation, or blueprint execution; use the dedicated skills for those.
---

# st-full-workflow

Drive the complete end-to-end Strikethroo workflow from initial plan creation through final blueprint execution and archival. The skill is assistant-agnostic and self-contained: every script it invokes lives under this skill's `scripts/` directory and is referenced by relative path.

## Critical Rule

Execute all three phases sequentially without waiting for user input between steps. This is a fully automated orchestration workflow. Progress indicators are for user visibility only and do not pause execution.

## Inputs

The user supplies the work order conversationally. Treat it as the only authoritative source of intent. Do not invent answers to clarifying questions — prompt the user instead.

## Context Passing Between Phases

Information flows through the workflow via structured output parsing:

1. **Phase 1 → Phase 2**: Extract the numeric `Plan ID` from the Phase 1 structured summary output. Use this exact ID to drive Phase 2.
2. **Phase 2 → Phase 3**: Extract the `Tasks` count from the Phase 2 structured summary output. Use this count for progress tracking during Phase 3.

Do not proceed to the next phase until the structured output from the current phase has been successfully parsed.

## Progress Indicators

Display progress indicators at key transition points to provide visual feedback without interrupting execution:

- `⬛⬜⬜ 33%` — Phase 1: Plan Creation Complete
- `⬛⬛⬜ 66%` — Phase 2: Task Generation Complete
- `⬛⬛⬛ 100%` — Phase 3: Blueprint Execution Complete

These indicators are purely informational. Do not pause or wait for user input when displaying them.

## Operating Procedure

### Phase 1: Plan Creation

**Progress**: `⬛⬜⬜ 33% - Phase 1/3: Starting Plan Creation`

#### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to execute the full workflow outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

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

The output must conform to `<root>/config/templates/PLAN_TEMPLATE.md`, including required YAML frontmatter fields (`id`, `summary`, `created`). Avoid time estimates, task lists, or code samples — those belong to the later task-generation phase.

The `<slug>` is derived from the plan summary: lowercase, alphanumeric and hyphens only, collapsed, trimmed.

#### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md` after the plan file is written.

#### 8. Emit the Phase 1 structured summary

Conclude Phase 1 with exactly this block:

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

Parse the `Plan ID` value from this output and pass it to Phase 2.

**Progress**: `⬛⬜⬜ 33% - Phase 1/3: Plan Creation Complete`

---

### Phase 2: Task Generation

**Progress**: `⬛⬜⬜ 33% - Phase 2/3: Starting Task Generation`

Using the Plan ID extracted from Phase 1:

#### 1. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the absolute path of the plan file. If the script exits non-zero, stop and report the error. Do not guess a different ID.

#### 2. Load project context

Read these files in order:

- `<root>/config/STRIKETHROO.md` — directory conventions.
- The plan body at the path returned above — this is the contract for what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — every task file must conform to this template.

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

#### 4. Apply granularity and skill rules

Each task must be:

- **Single-purpose** — one clear deliverable.
- **Atomic** — cannot be meaningfully split further.
- **Skill-specific** — executable by an agent with 1–2 technical skills.
- **Verifiable** — has explicit acceptance criteria.

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

**When TO write tests:**

- Custom business logic and algorithms.
- Critical user workflows and data transformations.
- Edge cases and error conditions for core functionality.
- Integration points between components.
- Complex validation logic or calculations.

**When NOT to write tests:**

- Third-party library functionality.
- Framework features.
- Simple CRUD operations without custom logic.
- Trivial getters/setters or static configuration.
- Obvious functionality that would break immediately if incorrect.

**Test task creation rules:**

- Combine related test scenarios into a single task (e.g. "Test user
  authentication flow" not separate tasks for login, logout, validation).
- Favor integration and critical-path coverage over per-method unit tests.
- Avoid one test task per CRUD operation.
- Question whether simple functions need a dedicated test task.

If any test task is generated, restate this section verbatim or near-verbatim
in that task's "Implementation Notes" so the executing agent applies it.

#### 6. Dependency analysis

For each task, identify:

- Hard dependencies — tasks that MUST complete before this one can start.
- Soft dependencies — tasks that SHOULD complete for optimal execution.

A task B depends on A if B requires A's output or artifacts, modifies code created by A, or tests functionality implemented by A. Validate that the final dependency graph is acyclic.

#### 7. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` to obtain the first available task ID. Allocate subsequent IDs by incrementing in-process. Use the unpadded integer in the task frontmatter `id` field and the zero-padded form (`{padded-id}--{slug}`) for the filename.

The slug derives from a short task title: lowercase, alphanumeric and hyphens only, collapsed, trimmed.

#### 8. Emit the task files

Write each task to:

```
<root>/plans/<plan-dir-name>/tasks/{padded-id}--{slug}.md
```

Each file must conform to `<root>/config/templates/TASK_TEMPLATE.md`,
including required frontmatter fields:

- `id` (integer)
- `group` (string)
- `dependencies` (array of task IDs, possibly empty)
- `status` — `pending` for new tasks
- `created` (YYYY-MM-DD)
- `skills` (array of 1–2 kebab-case skills)

Optional frontmatter for high-complexity or decomposed tasks:

- `complexity_score` (number, 1–10, include only if >4 or for decomposed
  tasks)
- `complexity_notes` (string)

The body sections (Objective, Skills Required, Acceptance Criteria, Technical
Requirements, Input Dependencies, Output Artifacts, Implementation Notes)
must be filled with task-specific content. Place detailed implementation
guidance inside a `<details>` block under "Implementation Notes" — write it
so a non-thinking LLM could execute the task from that section alone.

#### 9. Validation checklist

Before declaring task generation complete, verify:

- Each task has 1–2 appropriate technical skills assigned and inferred from
  its objectives.
- Dependencies form an acyclic graph; no orphan or circular references.
- Task IDs are unique, sequential, and start from the value returned by
  `get-next-task-id.cjs`.
- Groups are consistent and meaningful.
- Every **explicitly stated** deliverable in the plan is covered.
- No redundant or overlapping tasks.
- Minimization applied (20–30% reduction target).
- Test tasks focus on business logic, not framework functionality.
- No gold-plating: only plan requirements are addressed.

#### 10. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its instructions. This typically requires:

- Sanity-checking complexity.
- Appending an Execution Blueprint section to the plan document, including a Mermaid dependency diagram and explicit phase groupings.
- Use `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for structure.

#### 11. Emit the Phase 2 structured summary

Conclude Phase 2 with exactly this block:

```
---
Task Generation Summary:
- Plan ID: [numeric-id]
- Tasks: [count]
- Status: Ready for execution
```

Parse the `Tasks` count from this output and pass it to Phase 3 for progress tracking.

**Progress**: `⬛⬛⬜ 66% - Phase 2/3: Task Generation Complete`

---

### Phase 3: Blueprint Execution

**Progress**: `⬛⬛⬜ 66% - Phase 3/3: Starting Blueprint Execution`

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
- Execute the full task generation procedure from Phase 2 for this plan ID.
- After generation completes, re-run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` (and the other fields) to refresh the resolved paths and counts.
- If generation still leaves the plan without tasks or a blueprint, stop and report failure. Do not attempt execution without a valid blueprint.

#### 3. Optionally create a feature branch

Run `scripts/create-feature-branch.cjs <plan-id>`. The script creates a branch named after the plan and prints the branch name. Continue execution regardless of whether a branch is created.

#### 4. Load execution blueprint

Read these files in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- The plan document.
- The plan's Execution Blueprint section — this defines the phase groupings and task dispatch order.

#### 5. Execute phases in order

Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

##### 5a. Phase pre-execution
Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

##### 5b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_EXECUTION.md` and execute its instructions before starting any implementation work.

Deploy all selected agents simultaneously using your internal Task tool. Each agent MUST:

1. Read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any implementation work.
2. Execute the task according to its requirements.
3. Monitor execution progress and capture outputs and artifacts.
4. Update task status in real-time.

Maximize parallelism within each phase. Run every task that is ready at the same time.

##### 5c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

##### 5d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.

#### 6. Post-execution validation

Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

#### 7. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. If none occurred, state "No significant issues encountered."
- **Necessary follow-ups**: any follow-up actions or optimizations

#### 8. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure (including all tasks and subdirectories) to maintain referential integrity. If the move fails, log the error but do not fail the overall execution — the implementation work is complete.

**Progress**: `⬛⬛⬛ 100% - Phase 3/3: Blueprint Execution Complete`

## Failure Modes

- **No strikethroo root found.** Stop and instruct the user to initialize the project. Do not write any files or execute any tasks.
- **User refuses to answer a clarifying question that blocks planning in Phase 1.** Report `needs-clarification` and stop. Do not produce a partial plan.
- **Plan ID script fails.** Re-check the resolved root and re-run. If it continues to fail, surface stderr to the user and stop — do not guess an ID.
- **Plan directory already exists for the allocated ID in Phase 1.** Re-run the next-plan-id script and retry once. If the conflict persists, stop and report.
- **Plan ID does not resolve in Phase 2 or 3.** Stop and surface the script's stderr. Do not guess a different ID.
- **Missing blueprint after auto-generation in Phase 3.** If automatic task generation fails to produce tasks or a blueprint, stop and report failure. Do not attempt execution without a blueprint.
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
