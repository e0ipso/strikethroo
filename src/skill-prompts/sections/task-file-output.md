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

Required additional frontmatter:

- `complexity_score` (integer 1–10, required on every emitted task)

Optional frontmatter:

- `complexity_notes` (string) — include when the score needs justification,
  such as "Decomposed from a cross-cutting parent task" or "Ambiguous API
  contract".
- `execution` (mapping) — a task-only execution override. When present,
  `model` is required and must be an exact string. `reasoning_effort` and a
  different external `harness` are optional. Do not create plan defaults,
  inheritance, aliases, model discovery, or model-name translation.

The body sections (Objective, Skills Required, Acceptance Criteria, Technical
Requirements, Input Dependencies, Output Artifacts, Implementation Notes)
must be filled with task-specific content. Place detailed implementation
guidance inside a `<details>` block under "Implementation Notes" — write it
so a non-thinking LLM could execute the task from that section alone.
