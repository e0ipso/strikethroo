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
