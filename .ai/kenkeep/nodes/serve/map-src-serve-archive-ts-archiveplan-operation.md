---
type: map
title: src/serve/archive.ts — archivePlan() operation
description: >-
  Guarded discriminated-result function: validates plan exists, is under
  plans/, is in derived done state, then does atomic fs.rename into archive/.
tags:
  - serve
  - archive
  - api
kk_schema_version: 3
kk_id: map-src-serve-archive-ts-archiveplan-operation
kk_derived_from: []
kk_relates_to:
  - >-
    practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files
kk_depends_on: []
kk_confidence: high
---
`src/serve/archive.ts` exports `archivePlan(root, name)`, where `name` is the composite `{id}--{slug}` directory key. It resolves the plan through `getPlanDetail()`, verifies that it exists under `<root>/plans/`, checks the derived state is `done`, refuses to overwrite an existing archive destination, and performs one atomic `fs.rename` into `<root>/archive/`. It returns an `ArchiveResult` discriminated union and re-reads the moved plan on success.

The route `POST /api/plans/:key/archive` in `src/serve/server.ts` accepts only the composite-key grammar and maps the result to HTTP 200, 404, 409, or 500.

<!-- kk:related:start -->
# Related

- Related: [practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files](/serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md)
<!-- kk:related:end -->
