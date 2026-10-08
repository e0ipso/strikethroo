---
type: practice
title: >-
  markdown.ts needs a private DOMPurify instance or mermaid loses every SVG
  attribute
description: >-
  markdown.ts registers its sanitize hooks on a private DOMPurify instance; on
  the shared default they also apply to mermaid's strict-mode SVG pass and blank
  the Graph tab.
tags:
  - web
  - rendering
  - mermaid
  - dompurify
  - sanitization
  - gotcha
kk_schema_version: 3
kk_id: practice-markdown-policy-needs-its-own-dompurify-instance
kk_derived_from: []
kk_relates_to:
  - practice-review-gate-reports-it-does-not-fix
kk_depends_on: []
kk_confidence: high
---
DOMPurify hooks are registered per instance, and the default export is one shared instance. `src/web/render/markdown.ts` therefore creates its own with `createDOMPurify(window)` and registers `uponSanitizeAttribute` and `afterSanitizeAttributes` on that, not on the default.

The reason is mermaid. `renderMermaid` pins `securityLevel: 'strict'`, which makes mermaid sanitize its rendered SVG through the default DOMPurify instance. The markdown policy's attribute hook starts from "drop" and only keeps attributes that belong to inert prose, so when it sat on the shared instance mermaid's pass inherited it and stripped every `viewBox`, `d`, and coordinate from the diagram. The SVG was structurally complete, had its labels, and was invisible — a blank Graph tab.

Two things made this hard to catch. The symptom is geometry, not an error: nothing throws and the element count is normal. And the Graph e2e asserted only that an `svg` existed, which a fully attribute-stripped diagram satisfies, so the suite stayed green. That test now asserts a `viewBox`, at least one `g.node`, at least one drawn shape, and a floor on total attribute count.

Creating the instance at module load is safe because the module is browser-only: `ReaderProse` is its one importer, and `src/serve/` reads plan markdown without it. Do not move the hooks back to the default instance, and do not relax mermaid to `securityLevel: 'loose'` to work around a stripped diagram — that was the original XSS surface the strict setting closed.

<!-- kk:related:start -->
# Related

- Related: [practice-review-gate-reports-it-does-not-fix](/code-review/practice-review-gate-reports-it-does-not-fix.md)
<!-- kk:related:end -->
