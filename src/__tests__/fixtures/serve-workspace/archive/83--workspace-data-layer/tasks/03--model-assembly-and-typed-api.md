---
id: 3
group: "model-assembly"
dependencies: [1, 2]
status: "completed"
created: 2026-05-28
skills:
  - typescript
---
# Workspace model assembly, config enumeration, and typed public API

## Objective
Compose the parsing primitives (task 1) and derivation layer (task 2) into the
exported `src/serve/workspace-model.ts` public API: discovery/reuse wiring via
the existing shared helpers, config enumeration (hooks + templates), the
strongly-typed model interfaces, a top-level function returning the full model,
and narrower accessors for a single plan's detail and the config slice.

## Skills Required
- **typescript**: Typed module/API design, composition of pure functions,
  read-only filesystem enumeration with Node `fs`/`path`.

## Acceptance Criteria
- [ ] `src/serve/workspace-model.ts` exists and exports interfaces for plan
      summary, plan detail, task, phase, mermaid, and config shapes.
- [ ] The module accepts an explicit workspace root (path to
      `.ai/strikethroo/`) and falls back to `findStrikethrooRoot` when none is
      given.
- [ ] Plan and archive enumeration delegates to `getAllPlans`
      (`src/skill-scripts/shared/plan-scan.ts`); the model's `archived` flag
      maps from the entry's `isArchive`. No directory-walking is duplicated.
- [ ] For each plan, the model composes: frontmatter (`id`, `summary`,
      `created`), parsed named sections, extracted mermaid (with the
      Architectural Approach block identified), scanned tasks, derived state +
      done/total, and inferred phases + `phaseCount`.
- [ ] Config enumeration returns `config.hooks` (from `config/hooks/*.md`) and
      `config.templates` (from `config/templates/*.md`), each entry with an
      `id` derived from filename, the file path, and the file content. Missing
      directories yield empty lists.
- [ ] A top-level function returns the full model (summaries for active +
      archived plans plus the config block); a narrower function returns a
      single plan's detail; a narrower function returns the config slice.
- [ ] The module is synchronous and side-effect-free: reads only — no
      `fs.watch`, no `http`/`net` imports, no `writeFile`/`mkdir`/`rm`/`rename`.
- [ ] `npm run build` compiles it into `dist/` with no `tsc` errors and
      `npm run lint` reports no new errors.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Entry point: `src/serve/workspace-model.ts`, part of the CLI's `tsc` domain
  (ships in `dist/`). Must NOT pull in the skill-bundling/esbuild machinery.
- Reuse, do not fork: `findStrikethrooRoot`
  (`src/skill-scripts/shared/root.ts`), `getAllPlans`
  (`src/skill-scripts/shared/plan-scan.ts`), and `extractPlanId`
  (`src/skill-scripts/shared/frontmatter.ts`).
- Imports limited to Node `fs`/`path`, the shared helpers above, and the
  task-1/task-2 functions and types.
- Types exported for reuse by the future server (ticket 03) and SPA.

## Input Dependencies
- Task 1: frontmatter reader, body sectioner, mermaid extractor + types.
- Task 2: task scanner, derived-state computer, phase resolver + `Task`/`Phase`
  types.

## Output Artifacts
- `src/serve/workspace-model.ts` with the complete exported, typed model API:
  the full-model function, single-plan-detail accessor, config-slice accessor,
  and all model interfaces. This is the stable data contract ticket 03 and the
  UI screens consume.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

This task wires the pieces together; it should add no new parsing logic beyond
composition and config enumeration.

**Discovery.** The top-level function signature takes an optional workspace
root string. When omitted, call `findStrikethrooRoot` (it walks up for
`.ai/strikethroo/.init-metadata.json`). Pass the resolved root to `getAllPlans`,
which returns `{ id, file, dir, isArchive, name }` entries for both `plans/`
and `archive/`. Do not re-walk directories.

**Per-plan composition.** For each `PlanEntry`: read its plan `file`, run the
task-1 frontmatter reader and body sectioner, run the mermaid extractor (flag
the Architectural Approach block), run the task-2 task scanner against the
entry `dir`, then the derived-state computer and phase resolver. Set
`archived` from `isArchive`.

**Model shape.** Provide:
- A *summary* per plan for the list/board (id, slug/name, summary, created,
  state, done, total, phaseCount, archived).
- A *detail* per plan (summary fields + rawBody, named sections, full task
  list, phases, mermaid blocks).
Build `getWorkspaceModel(root?)` returning `{ plans: summary[], config }`
(active + archived), `getPlanDetail(root, planId)` returning a single detail,
and `getConfig(root)` returning the config slice. Keep names descriptive; the
exact identifiers are at the implementer's discretion but must be exported.

**Config enumeration.** Read `config/hooks/*.md` and `config/templates/*.md`.
For each: `id` from the filename (basename without `.md`), the absolute file
path, and the file content (sync read). Missing directory → empty list. Expect
9 hooks and 4 templates against this repo's own workspace (assert in task 4).

**Boundary.** Synchronous, read-only. Grep your output to confirm zero
`fs.watch`, `http`/`net` imports, and zero `writeFile`/`mkdir`/`rm`/`rename`.

**Documentation note:** the AGENTS.md update is a separate task (task 5); do
not write it here.
</details>
