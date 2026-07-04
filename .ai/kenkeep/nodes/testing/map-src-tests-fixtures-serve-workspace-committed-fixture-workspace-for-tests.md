---
type: map
title: >-
  src/__tests__/fixtures/serve-workspace/ — committed fixture workspace for
  tests
description: >-
  Committed fixture workspace at src/__tests__/fixtures/serve-workspace/ is the
  hermetic replacement for the gitignored live .ai/strikethroo/ in all
  integration and e2e suites.
tags:
  - testing
  - fixtures
  - integration
  - e2e
  - serve
kk_schema_version: 3
kk_id: map-src-tests-fixtures-serve-workspace-committed-fixture-workspace-for-tests
kk_derived_from: []
kk_relates_to:
  - >-
    practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
kk_depends_on: []
kk_confidence: high
---
`src/__tests__/fixtures/serve-workspace/` is a minimal but representative committed workspace used by all test suites that need a real workspace on disk.

It contains: `archive/38--fix-jekyll-link-baseurl/` (a done plan with 2 completed tasks), `archive/83--workspace-data-layer/`, `config/hooks/` (9 files), `config/templates/` (4 files), `.init-metadata.json`, and `plans/.gitkeep`.

Both unit/integration suites (`workspace-model.integration.test.ts`, `serve-server.integration.test.ts`) and the Playwright e2e suites resolve their `FIXTURE_ROOT` constant to this directory.

<!-- kk:related:start -->
# Related

- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
