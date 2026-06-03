---
schema_version: 1
id: >-
  practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t
title: >-
  Capture harness uses a committed fixture workspace, not the live
  .ai/strikethroo tree
kind: practice
tags:
  - capture
  - testing
  - fixtures
  - playwright
  - documentation
derived_from: []
relates_to: []
confidence: high
summary: >-
  The capture:web harness defaults to src/capture/fixtures/capture-workspace/
  for repeatable output. Set CAPTURE_WORKSPACE env var to override.
---
The documentation-capture harness (`src/capture/capture-web.ts`) must point at a committed, version-controlled fixture workspace rather than the live, gitignored `.ai/strikethroo/` tree. The live workspace changes between runs, making captures non-deterministic.

The fixture lives at `src/capture/fixtures/capture-workspace/` and contains active plans 102–104 and several archived plans across distinct months.

To point at a different workspace, set `CAPTURE_WORKSPACE=<path>`. To regenerate assets: run `npm run build:web` first, then `npm run capture:web`.
