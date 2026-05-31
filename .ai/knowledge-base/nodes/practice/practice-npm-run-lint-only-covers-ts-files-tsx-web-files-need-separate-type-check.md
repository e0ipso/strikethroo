---
schema_version: 1
id: >-
  practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check
title: npm run lint only covers .ts files; .tsx web files need separate type-check
kind: practice
tags:
  - web
  - lint
  - tsx
  - build
derived_from: []
relates_to: []
confidence: high
summary: >-
  The lint script globs src/**/*.ts only, leaving src/web/**/*.tsx outside the
  automated gate.
---
`npm run lint` is configured to glob `src/**/*.ts`, which excludes `src/web/**/*.tsx` files. Web component files are not automatically linted by the standard gate. When touching `.tsx` files, run `npm run format` and `tsc --noEmit -p tsconfig.web.json` manually to catch issues that would otherwise pass CI.
