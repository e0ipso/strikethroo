---
type: practice
title: 'After a git merge, always rebuild dist-web/ before running e2e tests'
description: >-
  E2e tests run against the prebuilt dist-web/ SPA. A merge can produce a
  corrupted mixed build that passes lint but fails e2e selectors with stale
  markup.
tags:
  - build
  - dist-web
  - testing
  - e2e
  - git
  - merge
kk_schema_version: 3
kk_id: practice-after-a-git-merge-always-rebuild-dist-web-before-running-e2e-tests
kk_derived_from: []
kk_relates_to:
  - >-
    practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime
kk_depends_on: []
kk_confidence: high
---
The Playwright e2e suite runs against the prebuilt static SPA in `dist-web/`, not against the live `src/web/` source. After a git merge, `dist-web/` may contain a corrupted mix of two overlapping builds: `index.html` may reference a bundle from the other branch that lacks new selectors or still carries deleted legacy classes.

The symptom is timeout failures in e2e tests waiting for selectors that exist in current source but not in the stale bundle.

Fix: `rm -rf dist-web && npm run build:web`. Since `dist-web/` is gitignored on `main`, no files need to be committed for this fix.

<!-- kk:related:start -->
# Related

- Related: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
<!-- kk:related:end -->
