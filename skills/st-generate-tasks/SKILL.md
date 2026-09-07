---
name: st-generate-tasks
description: Use when the user asks to decompose, break down, or generate tasks for an existing Strikethroo plan ID in this repository — triggers include generate tasks, break down the plan, decompose plan, create the task blueprint. Do not use to create a new plan, to execute tasks, or for generic project planning outside Strikethroo.
---

# st-generate-tasks

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

### 3. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — project and directory conventions.
- The plan body at the path returned by step 2 — the contract for
  what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — the schema every task file
  must match.
- `<root>/config/shared/anti-rationalization.md` — apply in step 4.

### 4. Analyze and decompose the plan

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

### 5. Apply granularity and skill rules

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

### 6. Test philosophy: "write a few tests, mostly integration"

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

### 7. Dependency analysis

Task B depends on task A when B requires A's output or artifacts, modifies
code created by A, or tests functionality implemented by A. Record it as a
**hard dependency** when B cannot start before A completes and as a **soft
dependency** when B merely runs better after A. Validate that the final
dependency graph is acyclic.

### 8. Complexity analysis

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

### 9. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` once for the first available task
ID, then allocate the rest by incrementing in-process. Use the unpadded
integer in the task frontmatter `id` field and the zero-padded form in the
filename. The slug derives from a short task title: lowercase, alphanumeric
and hyphens only, collapsed, trimmed.

### 10. Emit the task files

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

### 11. Validation checklist

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

### 12. Route task execution

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

### 13. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its
instructions, using `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for the
Execution Blueprint structure. Run the hook only after routing succeeded or
reported routing off.

When the retained update `notice` is present, append that exact sentence after
the structured summary block, or after your final response when this skill emits
no summary block. Nothing may follow the notice.

## Failure Modes

- **User declines to clarify a blocking ambiguity.** Mark the affected tasks
  with `status: "needs-clarification"` and document the open question in the
  task's "Implementation Notes". Do not invent answers.
- **A helper script fails unexpectedly.** Surface stderr to the user and
  stop — do not fall back to manual ID allocation or path discovery.
