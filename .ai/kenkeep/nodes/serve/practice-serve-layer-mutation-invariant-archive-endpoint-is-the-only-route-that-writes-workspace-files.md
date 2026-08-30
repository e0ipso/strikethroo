---
type: practice
title: >-
  Serve SPA has two sanctioned workspace mutations; self-review writes nothing
description: >-
  Archive moves done plans into archive/. Config writes overwrite one existing
  allowlisted file. Self-review spawns a process but writes no files.
tags:
  - serve
  - web
  - spa
  - architecture
  - testing
  - mutation
kk_schema_version: 3
kk_id: >-
  practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The `serve` SPA is a read-mostly workspace viewer. Plans are not created from the app. The server permits exactly two workspace mutations:

- `POST /api/plans/:key/archive` moves a `done` plan directory from `plans/` to `archive/` with an atomic rename. It is the manual escape hatch for done-but-unarchived plans and does not replace `st-execute-blueprint`'s automatic archival.
- `PUT /api/config/:kind/:id` overwrites one existing allowlisted config file. `hooks` and `templates` map to a flat Markdown child; `workspace/config` maps to `config/config.yaml`. It never creates, deletes, or renames a config file.

`POST /api/self-review` is another non-GET route, but it only spawns an external process. It does not write workspace files. Tests that audit the mutation boundary should distinguish HTTP methods from filesystem effects.
