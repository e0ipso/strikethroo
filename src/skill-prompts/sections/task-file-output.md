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
