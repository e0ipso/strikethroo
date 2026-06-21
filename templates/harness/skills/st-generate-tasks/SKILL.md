---
name: st-generate-tasks
description: Generate atomic Markdown tasks for an existing Strikethroo plan in this repository. Use when the user asks to decompose a specific plan ID into tasks — discovers the local .ai/strikethroo root, resolves the plan, runs the project's task-generation hooks, allocates sequential task IDs, and writes one task file per atomic unit conforming to TASK_TEMPLATE.md. Do not use for generic project planning or work outside Strikethroo.
---

# st-generate-tasks

Drive the end-to-end decomposition of an existing Strikethroo plan into
atomic Markdown task files. The skill is assistant-agnostic and self-contained:
every script it invokes lives under this skill's `scripts/` directory and is
referenced by relative path.

## Inputs

The user supplies the numeric plan ID conversationally. Treat it as the only
authoritative source of intent. Do not invent answers to clarifying questions —
prompt the user instead.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to generate tasks outside of a valid root.

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

### 3. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions for plans, tasks,
  and the archive layout.
- The plan body at the path returned by step 2 — this is the contract for
  what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — every task file you emit must
  conform to this template's frontmatter schema and section structure.

### 4. Analyze and decompose the plan

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

### 5. Apply granularity and skill rules

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

### 6. Test philosophy: "write a few tests, mostly integration"

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

### 7. Dependency analysis

For each task, identify:

- **Hard dependencies**: tasks that MUST complete before this one can start.
- **Soft dependencies**: tasks that SHOULD complete for optimal execution.

A task B depends on A if B requires A's output or artifacts, modifies code
created by A, or tests functionality implemented by A. Validate that the
final dependency graph is acyclic.

### 8. Allocate task IDs

Run `scripts/get-next-task-id.cjs <plan-id>` to obtain the first available
task ID. Allocate subsequent IDs by incrementing in-process; do not invoke
the script repeatedly. Use the unpadded integer in the task frontmatter `id`
field and the zero-padded form (`{padded-id}--{slug}`) for the filename.

The slug derives from a short task title: lowercase, alphanumeric and
hyphens only, collapsed, trimmed.

### 9. Emit the task files

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

### 10. Validation checklist

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

### 11. Run the POST_TASK_GENERATION_ALL hook

Read `<root>/config/hooks/POST_TASK_GENERATION_ALL.md` and follow its
instructions. This typically requires:

- Sanity-checking complexity (3+ technologies/skills → split; vague criteria
  → sharpen; trivially small → merge).
- Appending an Execution Blueprint section to the plan document, including a
  Mermaid dependency diagram and explicit phase groupings (Phase 1 contains
  zero-dependency tasks; each subsequent phase contains tasks whose
  dependencies all live in earlier phases). Use
  `<root>/config/templates/BLUEPRINT_TEMPLATE.md` for structure.

### 12. Emit the structured summary

Conclude with exactly this block as the final output:

```
---
Task Generation Summary:
- Plan ID: [numeric-id]
- Tasks: [count]
- Status: Ready for execution
```

The summary is consumed by downstream automation; keep the format exact.

## Failure Modes

- **No strikethroo root found.** Stop, instruct the user to initialize the
  project. Do not write any files.
- **Plan ID does not resolve.** Stop and surface the script's stderr to the
  user. Do not guess a different ID and do not write any files.
- **User declines to clarify a blocking ambiguity.** Mark the affected tasks
  with `status: "needs-clarification"` and document the open question in the
  task's "Implementation Notes". Do not invent answers.
- **A helper script fails unexpectedly.** Surface stderr to the user and
  stop — do not fall back to manual ID allocation or path discovery.
