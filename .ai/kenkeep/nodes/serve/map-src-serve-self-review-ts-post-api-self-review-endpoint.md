---
type: map
title: src/serve/self-review.ts — POST /api/self-review endpoint
description: >-
  Spawns an external reviewer binary; writes nothing to the workspace. Returns
  LaunchResult discriminated union. GET /api/capabilities reports availability
  and project identity.
tags:
  - serve
  - self-review
  - api
kk_schema_version: 3
kk_id: map-src-serve-self-review-ts-post-api-self-review-endpoint
kk_derived_from: []
kk_relates_to:
  - >-
    practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes
kk_depends_on: []
kk_confidence: high
---
`src/serve/self-review.ts` implements the self-review launch feature. It validates that the requested plan file stays under the workspace's `plans/` or `archive/` tree, then spawns the `self-review` binary detached without writing workspace files.

`GET /api/capabilities` is assembled in `src/serve/server.ts`. It returns `{ selfReview: boolean, project: { name, path } }`, combining `isSelfReviewAvailable()` with the project identity derived from the workspace root.

<!-- kk:related:start -->
# Related

- Related: [practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes](/serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md)
<!-- kk:related:end -->
