---
schema_version: 2
id: map-src-serve-self-review-ts-post-api-self-review-endpoint
title: src/serve/self-review.ts — POST /api/self-review endpoint
kind: map
tags:
  - serve
  - self-review
  - api
derived_from: []
relates_to: []
confidence: high
summary: >-
  Spawns an external reviewer binary; writes nothing to the workspace. Returns
  LaunchResult discriminated union. Also adds GET /api/capabilities.
---
`src/serve/self-review.ts` implements the self-review launch feature. It spawns an external binary without writing any files to the workspace — the canonical non-GET route that does **not** violate the filesystem-mutation boundary.

It also adds `GET /api/capabilities` to the server, returning `{ selfReview: boolean }` indicating whether the binary is on PATH.
