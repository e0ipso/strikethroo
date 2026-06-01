---
id: 2
group: "derivation-layer"
dependencies: [1]
status: "completed"
created: 2026-05-28
skills:
  - typescript
---
# Task scanning, derived plan state, and phase inference

## Objective
Build the per-plan derivation layer: scan a plan directory's `tasks/*.md`
files into structured task records, compute the derived plan lifecycle state
(`drafted`→`ready`→`doing`→`done`) with done/total counts, and infer execution
phases (from a blueprint document when present, else from task `group` +
`dependencies`). These pure functions feed the model assembler (task 3).

## Skills Required
- **typescript**: Typed pure functions, state-machine derivation, and
  dependency-graph phase grouping.

## Acceptance Criteria
- [ ] A task scanner reads a plan directory's `tasks/*.md`, parsing each task's
      frontmatter (`id`, `group`, `dependencies[]`, `status`, `skills[]`) via
      the task-1 frontmatter reader, the `# ` heading as the task `name`, and
      the body.
- [ ] Derived state follows the rule: no `tasks/` dir or empty → `drafted`;
      tasks present and none started → `ready`; ≥1 started or done but not all
      done → `doing`; all tasks done → `done`.
- [ ] `done`/`total` counts are computed where `completed` = done, `pending` =
      not-started, and any other/unknown status is treated as started
      (in-progress) and contributes to `doing`. Unknown statuses never throw.
- [ ] When a blueprint document exists in the plan directory, its phase list is
      parsed into ordered phases matching `BLUEPRINT_TEMPLATE.md`'s
      `### Phase N` shape.
- [ ] When no blueprint exists, phases are inferred by grouping tasks and
      ordering by `dependencies`: tasks with no unmet intra-set dependency form
      a parallel phase; dependent tasks fall into later phases. A phase is
      marked parallel when it holds >1 task.
- [ ] `phaseCount` equals the number of resulting phases; plan 38 must resolve
      to exactly one phase.
- [ ] Phase inference is best-effort and never throws on sparse/inconsistent
      dependency data.
- [ ] No `fs.watch`, no `http`/`net` imports, no write operations.
- [ ] `npm run build` and `npm run lint` pass for the new source.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- New/extended source under `src/serve/` (CLI `tsc` domain; ships in `dist/`).
- Reuse the frontmatter reader, body sectioner, and `# ` heading extraction
  from task 1. Reuse `extractPlanId` from
  `src/skill-scripts/shared/frontmatter.ts` where a numeric task id is needed.
- File reads here are synchronous Node `fs` reads of `tasks/*.md` (the scanner
  owns reading; the parsing of content is delegated to task-1 primitives).
- Blueprint detection: locate a blueprint markdown file in the plan directory
  and parse `### Phase N: ...` headings plus their listed tasks (see
  `BLUEPRINT_TEMPLATE.md`).

## Input Dependencies
- Task 1: frontmatter reader, body sectioner, `# ` heading extraction, and
  exported parse types.

## Output Artifacts
- Exported pure functions: per-plan task scanner, derived-state computer
  (returning state + done/total), and phase resolver (blueprint-parse or
  infer) returning ordered phases + `phaseCount`.
- Exported types for `Task` and `Phase`, consumed by task 3.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

Author under `src/serve/`, reusing the task-1 primitives.

**Task scanner.** Given a plan directory path, read `<dir>/tasks/`. If the
directory is missing or empty, return an empty task list (the state computer
will map this to `drafted`). For each `*.md` file: read it synchronously, run
the task-1 frontmatter reader to get `id`, `group`, `dependencies[]`,
`status`, `skills[]`; take the first `# ` heading text as `name`; keep the
body. Coerce `id` and numeric `dependencies` to numbers.

**Derived state.** Define a small status classifier:
- `completed` → done
- `pending` → not-started
- anything else (including unknown/in-progress variants) → started (counts
  toward `doing`, never throws)

Then: empty list → `drafted`. Non-empty and zero started/done → `ready`. All
done → `done`. Otherwise → `doing`. `total` = task count; `done` = count of
`completed`.

**Phase resolution.** First look for a blueprint doc in the plan directory
(a markdown file containing an "## Execution Blueprint" section / `### Phase N`
headings per `BLUEPRINT_TEMPLATE.md`). If found, parse each `### Phase N: Name`
and its bulleted task references into an ordered phase list.

If no blueprint: infer. Build a set from the scanned tasks. Repeatedly emit a
phase containing all tasks whose `dependencies` are all already-emitted (or not
present in the set, i.e. unmet deps are ignored as best-effort). Mark a phase
`parallel: true` when it has >1 task. Guard against cycles/sparse data by
breaking if no progress is made in an iteration (emit remaining tasks as a
final phase rather than looping forever). Never throw.

`phaseCount` = number of phases. Plan 38 (3 completed tasks, single group,
no/linear deps) must collapse to one phase — verify this in task 4's tests.

Hard boundary: synchronous, read-only, no `fs.watch`, no server/network
imports, no writes.
</details>
