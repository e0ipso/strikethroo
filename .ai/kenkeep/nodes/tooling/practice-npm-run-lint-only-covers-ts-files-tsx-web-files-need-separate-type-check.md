---
type: practice
title: npm run lint only covers .ts files; .tsx web files need separate type-check
description: >-
  The lint script globs src/**/*.ts only, leaving src/web/**/*.tsx outside the
  automated gate.
tags:
  - web
  - lint
  - tsx
  - build
kk_schema_version: 3
kk_id: >-
  practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check
kk_derived_from: []
kk_relates_to:
  - >-
    practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite
kk_depends_on: []
kk_confidence: high
---
`npm run lint` is configured to glob `src/**/*.ts`, which excludes `src/web/**/*.tsx` files. Web component files are not automatically linted by the standard gate. When touching `.tsx` files, run `npm run format` and `tsc --noEmit -p tsconfig.web.json` manually to catch issues that would otherwise pass CI.

<!-- kk:related:start -->
# Related

- Related: [practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite](/git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md)
<!-- kk:related:end -->
