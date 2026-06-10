---
schema_version: 2
id: >-
  practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files
title: >-
  Serve layer mutation invariant: archive endpoint is the only route that writes
  workspace files
kind: practice
tags:
  - serve
  - architecture
  - testing
  - mutation
derived_from: []
relates_to: []
confidence: high
summary: >-
  The correct invariant is not 'only non-GET route' but 'only route that mutates
  workspace files'. Self-review spawns a process but writes nothing.
---
The serve layer's mutation invariant: **the archive endpoint is the only HTTP route that writes to the workspace filesystem**. `POST /api/self-review` is also a non-GET route but it spawns an external process without writing any workspace files.

Integration tests that audit the mutation surface should assert this honest invariant rather than a literal count of non-GET routes.
