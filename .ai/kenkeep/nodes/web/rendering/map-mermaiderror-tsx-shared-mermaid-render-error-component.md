---
type: map
title: MermaidError.tsx — shared mermaid render-error component
description: >-
  src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a
  collapsed Details disclosure for the verbatim parse error.
tags:
  - mermaid
  - spa
  - components
  - error-handling
kk_schema_version: 3
kk_id: map-mermaiderror-tsx-shared-mermaid-render-error-component
kk_derived_from: []
kk_relates_to:
  - practice-set-suppresserrorrendering-true-in-mermaid-initialization
kk_depends_on: []
kk_confidence: high
---
`src/web/plans/detail/MermaidError.tsx` is the shared render-error surface for invalid mermaid diagrams. It renders a Lucide `Frown` icon (soft red), a "Couldn't draw this diagram" message, and a native `<details>` element (collapsed by default) containing the verbatim parser error in a monospace block.

Both mermaid consumers — `PlanDetailGraph.tsx` (Graph tab) and `ReaderProse.tsx` (Plan tab) — use this component when `renderMermaid()` throws. The Reader places it above the existing `▶ Source` disclosure for the raw mermaid source.

<!-- kk:related:start -->
# Related

- Related: [practice-set-suppresserrorrendering-true-in-mermaid-initialization](/web/rendering/practice-set-suppresserrorrendering-true-in-mermaid-initialization.md)
<!-- kk:related:end -->
