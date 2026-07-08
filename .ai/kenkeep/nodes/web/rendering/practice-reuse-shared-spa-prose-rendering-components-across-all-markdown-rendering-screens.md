---
type: practice
title: >-
  Reuse shared SPA prose-rendering components across all markdown-rendering
  screens
description: >-
  The project has a standing code-reuse mandate: all markdown-rendering screens
  must use the shared Section/ReaderProse renderer.
tags:
  - web
  - spa
  - components
  - reuse
  - architecture
kk_schema_version: 3
kk_id: >-
  practice-reuse-shared-spa-prose-rendering-components-across-all-markdown-rendering-screens
kk_derived_from: []
kk_relates_to:
  - map-mermaiderror-tsx-shared-mermaid-render-error-component
kk_depends_on: []
kk_confidence: high
---
The project enforces a code-reuse mandate for SPA UI components. When a shared renderer exists (the `Section` component exported from `ReaderProse.tsx`), every screen rendering the same content type must use it — creating a parallel implementation is a violation.

Concrete constraint: any SPA screen rendering plan or task markdown prose must go through the `Section` renderer from `ReaderProse.tsx`, gaining the `##`-heading affordance, inline lazy/themed mermaid, and the Success-Criteria `.crit` treatment uniformly.

The rule was stated when the Task Detail screen was found using a one-off `<div className="prose" dangerouslySetInnerHTML={renderMarkdown(body)}>` instead of the shared component: "That is a violation of the mandate of code reuse!"

<!-- kk:related:start -->
# Related

- Related: [map-mermaiderror-tsx-shared-mermaid-render-error-component](/web/rendering/map-mermaiderror-tsx-shared-mermaid-render-error-component.md)
<!-- kk:related:end -->
