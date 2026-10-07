---
type: map
title: One blueprint parser serves the viewer, the validator, and execution
description: >-
  parseBlueprintPhases lives once in src/skill-scripts/shared/blueprint-parse.ts
  and serves the viewer, the validator, and execution. Only inferPhases, the
  no-blueprint fallback, is viewer-only.
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
One `parseBlueprintPhases` reads the author-written `## Execution Blueprint` section, in `src/skill-scripts/shared/blueprint-parse.ts`. Three consumers share it: `resolvePhases` in `src/serve/derivation.ts` for the viewer, `graph-checks.ts` for `strikethroo validate`, and `check-phase-readiness.ts` for execution. It returns `BlueprintPhase` (`index`, optional `name`, `taskIds`); the viewer maps that to its own `Phase` by adding the presentational `parallel` flag. `src/serve/derivation.ts` does **not** export a parser, so a change to phase semantics reaches every consumer at once.

What remains viewer-only is `inferPhases` in `src/serve/derivation.ts`, the fallback `resolvePhases` uses when a plan has tasks but no authored blueprint — a plan that is not yet executable. Its behaviour on a dependency cycle is to absorb the cycle into one phase, which is a wrong *display*, not wrong execution. Execution never infers phases from `dependencies`.

The import direction is fixed: `src/serve/` and `src/validation/` may import `src/skill-scripts/shared/`, never the reverse, because the skill entrypoints are bundled whole by esbuild. `blueprint-parse` is consequently part of the `dist/skill-scripts/shared/` closure.

<!-- kk:related:start -->
# Related

- Related: [map-parseblueprintphases-slices-blueprint-section-to-end-of-document](/serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md)
- Related: [practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter](/serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [ecba74ac-907e-4ecc-bb2b-60c89a695f4a:map:0](ecba74ac-907e-4ecc-bb2b-60c89a695f4a:map:0)
<!-- kk:citations:end -->
