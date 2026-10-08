---
type: practice
title: The required gate lints tsx and type-checks the web production code
description: >-
  npm run lint globs ts and tsx, and the web type check runs inside npm run build
  as typecheck:web, with the SPA suites checked by typecheck:web-tests.
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
`npm run lint` globs `src/**/*.{ts,tsx}`, so web component files are linted by the standard gate, and the ESLint flat config carries a `src/web/**/*.tsx` block.

The SPA's types are gated too. `npm run build` is `tsc && npm run typecheck:web && npm run build:web && …`, where `typecheck:web` is `tsc --noEmit -p tsconfig.web.json`; `vite build` only transpiles, so without that step a production type error ships. `tsconfig.web.json` is production-only and `tsconfig.web-tests.json` extends it with the Vitest globals, run by `test:unit` before `vitest run`.

So there is nothing to run by hand for `.tsx` work: `npm run build` and `npm run lint` cover it. `tsconfig.test.json` is separate and dead — no script runs it and it reports errors.

<!-- kk:related:start -->
# Related

- Related: [practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite](/git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md)
<!-- kk:related:end -->
