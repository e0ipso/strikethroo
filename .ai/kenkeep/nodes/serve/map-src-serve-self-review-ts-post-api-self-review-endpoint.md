---
type: map
title: src/serve/self-review.ts — POST /api/self-review endpoint
description: >-
  Spawns an external reviewer binary; writes nothing to the workspace. Returns
  LaunchResult discriminated union. Also adds GET /api/capabilities.
tags:
  - serve
  - self-review
  - api
kk_schema_version: 3
kk_id: map-src-serve-self-review-ts-post-api-self-review-endpoint
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
`src/serve/self-review.ts` implements the self-review launch feature. It spawns an external binary without writing any files to the workspace — the canonical non-GET route that does **not** violate the filesystem-mutation boundary.

It also adds `GET /api/capabilities` to the server, returning `{ selfReview: boolean }` indicating whether the binary is on PATH.
