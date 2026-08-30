---
type: practice
title: 'Serve layer uses discriminated-union result types for guarded operations'
description: >-
  Archive, config-write, and self-review operations return typed result unions;
  route handlers map their variants to HTTP responses.
tags:
  - serve
  - architecture
  - error-handling
kk_schema_version: 3
kk_id: >-
  practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
Guarded serve operations return discriminated results instead of throwing for expected failures. `archive.ts` exposes `ArchiveResult`, `config-write.ts` exposes `ConfigWriteResult`, and `self-review.ts` exposes `LaunchResult`. Each type carries either success data or a finite failure reason and user-facing message or response body.

Thin route handlers map each variant to the appropriate HTTP status. Unexpected filesystem or process failures still resolve to a safe error variant, so route code does not need to inspect thrown implementation errors.
