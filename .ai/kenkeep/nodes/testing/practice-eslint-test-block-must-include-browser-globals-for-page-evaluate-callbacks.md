---
type: practice
title: ESLint test block must include browser globals for page.evaluate callbacks
description: >-
  Playwright e2e tests use page.evaluate with browser globals (location, URL,
  document); the ESLint test block must include browserGlobals to avoid no-undef
  errors.
tags:
  - linting
  - eslint
  - globals
  - testing
  - e2e
kk_schema_version: 3
kk_id: >-
  practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The ESLint config (`eslint.config.mjs`) defines a shared `browserGlobals` object applied to both the test block and the SPA web block. This is required because Playwright e2e tests use `page.evaluate()` callbacks that reference `location`, `URL`, `document`, and similar browser globals.

`__APP_VERSION__` (a Vite `define`) is also added to the web SPA block's globals.

The test-globals override glob covers `src/**/*.test.ts` and `src/**/__tests__/**/*.ts`. Extending it to include `.tsx` is needed if `.test.tsx` files are added (the project has one: `src/web/archive/__tests__/helpers.test.tsx`).
