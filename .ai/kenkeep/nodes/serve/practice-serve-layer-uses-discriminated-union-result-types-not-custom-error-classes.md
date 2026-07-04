---
type: practice
title: 'Serve layer uses discriminated-union result types, not custom error classes'
description: >-
  AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual
  serve convention is a discriminated ArchiveResult/LaunchResult union.
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
The AGENTS.md 'Custom Error Classes' section (`FileSystemError`, `ConfigError`, `TemplateError`, `HarnessError`) is aspirational — none of these classes exist in `src/` at runtime. The actual convention in the serve layer is a **discriminated-union result type**: a union of `{ ok: true, ... }` and `{ ok: false, reason: string, ... }` variants returned from pure operation functions, established by `self-review.ts` (`LaunchResult`) and followed by `archive.ts` (`ArchiveResult`).

Thin route handlers map each variant to the appropriate HTTP status code.
