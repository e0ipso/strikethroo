---
schema_version: 2
id: map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations
title: Cross-harness code abstraction centralized in ~54 lines across 3 locations
kind: map
tags:
  - architecture
  - harness
  - skills
derived_from: []
relates_to: []
confidence: high
summary: >-
  All harness-specific logic lives in src/types.ts (union type), src/utils.ts
  (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure).
  Skills are harness-agnostic.
---
The entire harness abstraction surface is: the `Harness` union type in `src/types.ts:11`, the `VALID_HARNESSES` array and `getAgentFormat()` switch in `src/utils.ts:9–191`, a `convertAgentMdToToml()` helper for Codex in `src/utils.ts:151–165`, and the `createHarnessStructure()` dispatch in `src/index.ts:330–344`. Total: ~54 lines, zero duplication.

Adding a new harness requires exactly 3 touches: add to the type union, add to the constant array, add a case to the switch. No SKILL.md or `.cjs` bundle contains harness-specific logic.
