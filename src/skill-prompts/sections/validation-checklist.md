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
  Every generated task must carry an integer `complexity_score` from 1 to 10.
- Add `complexity_notes` only when a score needs explanation (typically atomic
  tasks scoring greater than 4).
