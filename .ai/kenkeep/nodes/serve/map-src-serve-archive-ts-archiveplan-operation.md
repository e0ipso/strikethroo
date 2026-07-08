---
type: map
title: src/serve/archive.ts — archivePlan() operation
description: >-
  Pure discriminated-result function: validates plan exists, is under plans/, is
  in derived done state, then does atomic fs.rename into archive/.
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
`src/serve/archive.ts` exports `archivePlan(planId, root)` which: (1) verifies the plan directory exists under `<root>/plans/`; (2) checks the plan is in derived `done` state via the workspace model; (3) performs a single atomic `fs.rename` into `<root>/archive/`; (4) refuses to overwrite an existing destination; (5) returns an `ArchiveResult` discriminated union.

The route `POST /api/plans/:id/archive` in `src/serve/server.ts` maps the result to HTTP 200/404/409/500.

<!-- kk:related:start -->
# Related

- Related: [practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files](/serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md)
<!-- kk:related:end -->
