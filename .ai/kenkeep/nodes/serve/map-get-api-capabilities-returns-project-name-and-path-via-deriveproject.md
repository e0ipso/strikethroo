---
type: map
title: GET /api/capabilities returns project name and path via deriveProject()
description: >-
  The capabilities endpoint exposes { selfReview, readOnly, project: { name, path } }.
  deriveProject(root) resolves the project directory two levels up from the
  .ai/strikethroo root.
tags:
  - serve
  - api
  - capabilities
  - sidebar
  - project
kk_schema_version: 3
kk_id: map-get-api-capabilities-returns-project-name-and-path-via-deriveproject
kk_derived_from: []
kk_relates_to:
  - map-src-serve-self-review-ts-post-api-self-review-endpoint
kk_depends_on: []
kk_confidence: high
---
`GET /api/capabilities` in `src/serve/server.ts` returns `{ selfReview: boolean, readOnly: boolean, project: { name: string, path: string } }`. `readOnly` is true under `serve --read-only`; the SPA reads it through `useReadOnly()` and hides the Archive, Review in self-review, and Customize save controls. The `project` field comes from `deriveProject(root)`, which resolves the project directory two levels above a standard `.ai/strikethroo` workspace root.

`deriveProject` returns the directory's `name` (basename) and absolute `path`. For non-standard layouts (e.g. shallow test fixtures), it falls back to the root itself. The `name` is displayed in the Sidebar footer; the `path` is the hover tooltip.

`src/web/data/api.ts` models this with `ProjectInfo` and an optional `Capabilities.project` field so the SPA remains compatible with a server that returns only `selfReview`. `Sidebar` reads it through `useCapabilities()` and displays `.ai/strikethroo/` until project data is available.

<!-- kk:related:start -->
# Related

- Related: [map-src-serve-self-review-ts-post-api-self-review-endpoint](map-src-serve-self-review-ts-post-api-self-review-endpoint.md)
<!-- kk:related:end -->
