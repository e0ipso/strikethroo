---
schema_version: 1
id: practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter
title: >-
  Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter
  Tasks tab
kind: practice
tags:
  - web
  - spa
  - serve
  - plan-detail
  - execution-blueprint
derived_from: []
relates_to: []
confidence: high
summary: >-
  Four data sources feed the Plan Detail tabs; the blueprint prose and
  tasks-frontmatter rendering must not be conflated
---
In the serve SPA Plan Detail screen (`src/web/plans/detail/`), four distinct data sources feed the tabs and must not be conflated:

- **Plan tab** (`PlanDetailReader` → `ReaderProse`) renders the narrative `##` markdown sections of `plan.md` *before* the Results boundary.
- **Results tab** (`PlanDetailResults`) renders the execution-time tail of the markdown — the first of `## Notes` / `## Execution Blueprint` and everything after it (to EOF) — sliced from the same parsed `sections` array by `splitResultsSections` in `src/web/plans/derive.ts`. The split point is whichever of the two headings appears first: in the canonical plan structure `## Notes` is the last narrative section and `## Execution Blueprint` is appended after it during task generation, but a few older plans reverse that order.
- **BlueprintRail** (the right-side rail on the Plan tab) is driven by the derived `phases`/`tasks` structures, not by markdown prose.
- **Tasks tab** (`ExecuteTab`, Swimlanes) renders the per-task frontmatter.

The blueprint/notes *prose sections* (Results tab) and the Tasks-tab *frontmatter rendering* are two separate things. When asked to move or change "the Execution Blueprint", clarify which one is meant: the markdown section (Plan-doc prose, now on the Results tab) or the tasks-driven views. Both `PlanDetailReader` and `PlanDetailResults` reuse the exported `Section` renderer from `ReaderProse.tsx` so markdown/sanitization (`renderMarkdown`) and the mermaid source affordance stay identical across the split.
