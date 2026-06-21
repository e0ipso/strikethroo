---
name: st-generate-tasks
description: "Use when the user asks to decompose, break down, or generate tasks for an existing Strikethroo plan ID in this repository — triggers include generate tasks, break down the plan, decompose plan, create the task blueprint. Do not use to create a new plan, to execute tasks, or for generic project planning outside Strikethroo."
target: st-generate-tasks
vars:
  action_verb_phrase: "generate tasks"
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

{{include sections/root-discovery.md}}

### 2. Resolve the plan

{{include sections/plan-resolution.md}}

### 3. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions for plans, tasks,
  and the archive layout.
- The plan body at the path returned by step 2 — this is the contract for
  what tasks must exist.
- `<root>/config/templates/TASK_TEMPLATE.md` — every task file you emit must
  conform to this template's frontmatter schema and section structure.
- `<root>/config/shared/anti-rationalization.md` — the shared enforcement
  discipline this skill applies; keep it in context for step 4.

### 4. Analyze and decompose the plan

{{include sections/task-minimization.md}}

Apply `<root>/config/shared/anti-rationalization.md` (loaded with project context) to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "One extra task won't hurt." | It violates the 20–30% minimization target. Every task traces to an **explicitly stated** deliverable or it does not exist. |
| "This edge case deserves its own task." | Fold it into the task that owns the behavior. Do not split trivially small operations into separate units. |
| "I'll add a test suite to be safe." | Comprehensive tests for trivial functionality are gold-plating. Follow the test philosophy — meaningful tests only. |
| "Future extensibility justifies this task." | YAGNI. The plan does not mention it, so it is not a task. |

### 5. Apply granularity and skill rules

{{include sections/granularity-skill-rules.md}}

### 6. Test philosophy: "write a few tests, mostly integration"

{{include sections/test-philosophy.md}}

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

{{include sections/task-file-output.md}}

### 10. Validation checklist

{{include sections/validation-checklist.md}}

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
