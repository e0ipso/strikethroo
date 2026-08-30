---
type: map
title: Phase derivation is implemented twice — viewer path and execution path
description: >-
  src/serve/derivation.ts serves the read-only viewer;
  src/skill-scripts/shared/blueprint-parse.ts serves execution. A change to one
  does not reach the other.
tags:
  - blueprint
  - phase
  - serve
  - derivation
  - skill-scripts
kk_schema_version: 3
kk_id: map-phase-derivation-is-implemented-twice-viewer-path-and-execution-path
kk_derived_from:
  - 'ecba74ac-907e-4ecc-bb2b-60c89a695f4a:map:0'
kk_relates_to:
  - map-parseblueprintphases-slices-blueprint-section-to-end-of-document
  - practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter
kk_depends_on: []
kk_confidence: high
---
Phase structure is computed by two independent implementations with different inputs and different consumers.

The viewer path lives in `src/serve/derivation.ts`. `resolvePhases` (`:252`) prefers the author-written blueprint via that file's own `parseBlueprintPhases` (`:163`) and falls back to `inferPhases` (`:217`), which derives phases from task `dependencies`. Its only caller chain is `resolvePhases` → `buildDetail` (`src/serve/workspace-model.ts`), i.e. the read-only viewer. Because the blueprint wins when one exists, `inferPhases` is reachable only for plans that have tasks but no blueprint — plans that are not yet executable. Its behaviour on a dependency cycle is to absorb the cycle into one mega-phase, which is a wrong *display*, not wrong execution.

The execution path uses a separate `parseBlueprintPhases` in `src/skill-scripts/shared/blueprint-parse.ts:11`, consumed by `src/skill-scripts/check-phase-readiness.ts`. It reads the author-written `## Execution Blueprint` section and never infers phases from `dependencies`.

The two blueprint parsers are near-identical and are a standing duplication. A change to phase semantics that touches only one of them changes only the viewer or only execution, never both.

<!-- kk:related:start -->
# Related

- Related: [map-parseblueprintphases-slices-blueprint-section-to-end-of-document](/serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md)
- Related: [practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter](/serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [ecba74ac-907e-4ecc-bb2b-60c89a695f4a:map:0](ecba74ac-907e-4ecc-bb2b-60c89a695f4a:map:0)
<!-- kk:citations:end -->
