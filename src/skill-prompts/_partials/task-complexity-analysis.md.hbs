For every candidate task, assign a `complexity_score` (integer 1–10) before
writing any file. Base the score on these four dimensions:

| Score | Skill breadth | Acceptance-criteria clarity | Integration surface | Decomposition depth |
| --- | --- | --- | --- | --- |
| 1–3 | One well-known skill | Criteria are concrete and observable | None or a single file/module | No further split possible |
| 4–5 | One primary skill plus a familiar adjacent skill | Criteria are clear with few edge cases | One component or API boundary | Already atomic |
| 6–7 | Two distinct skills, or one skill with ambiguous requirements | Criteria need clarification or have multiple edge cases | Multiple components or contracts | Could still be split |
| 8–10 | Three or more skills, or cross-cutting design decisions | Criteria are vague, unknown, or depend on unresolved choices | Wide integration surface or external systems | Must be decomposed further |

**Pre-emission sanity rules** — apply these before any task is written:

- 3+ skills assigned → split the task into smaller tasks, each with 1–2 skills.
- Vague acceptance criteria → sharpen them until they include at least one
  concrete, runnable verification step.
- Trivially small adjacent tasks → merge them into a single task.
- Score ≥ 8 → decompose further; do not emit as-is.
- Score 6–7 → either sharpen criteria or split; do not emit without an
  explicit reason.

**Required frontmatter:**

- Every emitted task MUST include `complexity_score` (integer 1–10).
- Optionally include `complexity_notes` when the score needs justification,
  such as "Ambiguous API contract" or "Decomposed from a higher-score parent".

**Loop-back rule:**

After applying split, sharpen, or merge, re-run dependency analysis and
re-score the adjusted tasks. Repeat this loop no more than three times. If
complexity is still unresolved after three passes, stop and surface the
blocker to the user.
