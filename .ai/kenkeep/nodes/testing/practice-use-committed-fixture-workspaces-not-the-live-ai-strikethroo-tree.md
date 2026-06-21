---
schema_version: 2
id: practice-use-committed-fixture-workspaces-not-the-live-ai-strikethroo-tree
title: >-
  Use committed fixture workspaces, not the live gitignored .ai/strikethroo/
  tree
kind: practice
tags:
  - testing
  - capture
  - fixtures
  - playwright
  - ci
  - integration
  - e2e
  - gitignore
  - documentation
derived_from: []
relates_to:
  - >-
    practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
depends_on: []
confidence: high
summary: >-
  Capture, integration, and e2e must use committed fixture workspaces — not
  the live gitignored .ai/strikethroo/ tree that breaks CI and capture
  determinism.
---
The project's `.ai/strikethroo/` workspace is gitignored. Any harness that reads the live tree gets non-deterministic or CI-only-local behavior.

**Capture** (`src/capture/capture-web.ts`) must point at a committed fixture at `src/capture/fixtures/capture-workspace/` rather than the live tree. Set `CAPTURE_WORKSPACE=<path>` to override. Regenerate assets with `npm run build:web` then `npm run capture:web`.

**Integration and e2e tests** must point at `src/__tests__/fixtures/serve-workspace/` instead of the live workspace. Name the constant `FIXTURE_ROOT` for clarity. Tests reading `.ai/strikethroo/` directly only pass locally; CI's clean checkout has no workspace on disk.

Adding representative fixture files is the correct fix when new test assertions require new workspace shape; never repoint capture or tests back to the live tree.
