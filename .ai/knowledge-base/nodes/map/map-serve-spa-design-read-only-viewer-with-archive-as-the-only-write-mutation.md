---
schema_version: 1
id: map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation
title: 'serve SPA design: read-only viewer with archive as the only write mutation'
kind: map
tags:
  - web
  - spa
  - serve
  - architecture
derived_from: []
relates_to: []
confidence: high
summary: >-
  The serve web app is strictly read-only except for archive: POST
  /api/plans/:id/archive moves a done plan to archive/.
---
The `serve` SPA is a read-only workspace viewer. Plans are not created from the app. The only write-back is the archive action: moving a completed (`done`-state) plan directory from `.ai/strikethroo/plans/` to `.ai/strikethroo/archive/` via `POST /api/plans/:id/archive`.

This is the manual escape hatch for done-but-unarchived plans. It does not replace `st-execute-blueprint`'s automatic archival on successful completion.
