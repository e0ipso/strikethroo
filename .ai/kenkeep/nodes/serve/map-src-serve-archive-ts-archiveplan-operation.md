---
schema_version: 2
id: map-src-serve-archive-ts-archiveplan-operation
title: src/serve/archive.ts — archivePlan() operation
kind: map
tags:
  - serve
  - archive
  - api
derived_from: []
relates_to: []
confidence: high
summary: >-
  Pure discriminated-result function: validates plan exists, is under plans/, is
  in derived done state, then does atomic fs.rename into archive/.
---
`src/serve/archive.ts` exports `archivePlan(planId, root)` which: (1) verifies the plan directory exists under `<root>/plans/`; (2) checks the plan is in derived `done` state via the workspace model; (3) performs a single atomic `fs.rename` into `<root>/archive/`; (4) refuses to overwrite an existing destination; (5) returns an `ArchiveResult` discriminated union.

The route `POST /api/plans/:id/archive` in `src/serve/server.ts` maps the result to HTTP 200/404/409/500.
