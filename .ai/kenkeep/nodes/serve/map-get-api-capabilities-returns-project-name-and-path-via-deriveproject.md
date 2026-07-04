---
type: map
title: GET /api/capabilities returns project name and path via deriveProject()
description: >-
  The capabilities endpoint exposes { selfReview, project: { name, path } }.
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
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
`GET /api/capabilities` in `src/serve/server.ts` returns `{ selfReview: boolean, project: { name: string, path: string } }`. The `project` field is populated by `deriveProject(root)`, which resolves the project directory as two levels up from the `.ai/strikethroo` workspace root.

`deriveProject` returns the directory's `name` (basename) and absolute `path`. For non-standard layouts (e.g. shallow test fixtures), it falls back to the root itself. The `name` is displayed in the Sidebar footer; the `path` is the hover tooltip.

The `Capabilities` type in `src/web/data/api.ts` includes `project?: { name: string; path: string }`. The SPA reads it via `useCapabilities()` in the Sidebar component.
