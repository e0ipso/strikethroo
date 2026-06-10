---
schema_version: 2
id: >-
  practice-integration-and-e2e-tests-must-use-the-committed-fixture-workspace-not-the-live
title: >-
  Integration and e2e tests must use the committed fixture workspace, not the
  live .ai/strikethroo/
kind: practice
tags:
  - testing
  - fixtures
  - ci
  - integration
  - e2e
  - gitignore
derived_from: []
relates_to:
  - >-
    practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
confidence: high
summary: >-
  Tests reading .ai/strikethroo/ directly only pass locally; CI has no workspace
  on clean checkout. All tests must use src/__tests__/fixtures/serve-workspace/.
---
The project's `.ai/strikethroo/` workspace is gitignored. Any integration or e2e test that reads the live workspace passes locally but fails on CI's clean checkout with `ENOENT` or empty data.

All suites that need a workspace must point at the committed fixture workspace at `src/__tests__/fixtures/serve-workspace/` instead. Name the constant `FIXTURE_ROOT` for clarity.

Adding representative fixture files is the correct fix when new test assertions require new workspace shape; never repoint tests back to the live tree.
