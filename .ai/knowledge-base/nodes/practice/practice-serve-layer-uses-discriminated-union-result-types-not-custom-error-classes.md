---
schema_version: 1
id: >-
  practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes
title: 'Serve layer uses discriminated-union result types, not custom error classes'
kind: practice
tags:
  - serve
  - architecture
  - error-handling
derived_from: []
relates_to: []
confidence: high
summary: >-
  AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual
  serve convention is a discriminated ArchiveResult/LaunchResult union.
---
The AGENTS.md 'Custom Error Classes' section (`FileSystemError`, `ConfigError`, `TemplateError`, `HarnessError`) is aspirational — none of these classes exist in `src/` at runtime. The actual convention in the serve layer is a **discriminated-union result type**: a union of `{ ok: true, ... }` and `{ ok: false, reason: string, ... }` variants returned from pure operation functions, established by `self-review.ts` (`LaunchResult`) and followed by `archive.ts` (`ArchiveResult`).

Thin route handlers map each variant to the appropriate HTTP status code.
