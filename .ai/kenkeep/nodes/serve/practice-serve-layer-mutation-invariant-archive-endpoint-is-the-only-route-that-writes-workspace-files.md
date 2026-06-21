---
schema_version: 2
id: >-
  practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files
title: >-
  Serve SPA is read-only; archive is the only workspace mutation (self-review
  writes nothing)
kind: practice
tags:
  - serve
  - web
  - spa
  - architecture
  - testing
  - mutation
derived_from: []
relates_to: []
confidence: high
summary: >-
  The serve SPA is read-only except archive: POST /api/plans/:id/archive moves
  done plans to archive/. Self-review spawns a process but writes no files.
---
The `serve` SPA is a read-only workspace viewer. Plans are not created from the app. The only write-back is the archive action: moving a completed (`done`-state) plan directory from `.ai/strikethroo/plans/` to `.ai/strikethroo/archive/` via `POST /api/plans/:id/archive`. This is the manual escape hatch for done-but-unarchived plans. It does not replace `st-execute-blueprint`'s automatic archival on successful completion.

The serve layer's mutation invariant: **the archive endpoint is the only HTTP route that writes to the workspace filesystem**. `POST /api/self-review` is also a non-GET route but it spawns an external process without writing any workspace files.

Integration tests that audit the mutation surface should assert this honest invariant rather than a literal count of non-GET routes.
