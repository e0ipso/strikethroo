---
schema_version: 1
id: map-mermaiderror-tsx-shared-mermaid-render-error-component
title: MermaidError.tsx — shared mermaid render-error component
kind: map
tags:
  - mermaid
  - spa
  - components
  - error-handling
derived_from: []
relates_to: []
confidence: high
summary: >-
  src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a
  collapsed Details disclosure for the verbatim parse error.
---
`src/web/plans/detail/MermaidError.tsx` is the shared render-error surface for invalid mermaid diagrams. It renders a Lucide `Frown` icon (soft red), a "Couldn't draw this diagram" message, and a native `<details>` element (collapsed by default) containing the verbatim parser error in a monospace block.

Both mermaid consumers — `PlanDetailGraph.tsx` (Graph tab) and `ReaderProse.tsx` (Plan tab) — use this component when `renderMermaid()` throws. The Reader places it above the existing `▶ Source` disclosure for the raw mermaid source.
