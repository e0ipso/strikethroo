---
type: practice
title: Vitest test suite runs in node environment — browser APIs unavailable in tests
description: >-
  Vitest is configured with environment: node; localStorage, matchMedia, and
  document are unavailable. Isolate DOM-touching code behind pure interfaces.
tags:
  - testing
  - vitest
  - browser
  - dom
  - node
kk_schema_version: 3
kk_id: >-
  practice-vitest-test-suite-runs-in-node-environment-browser-apis-unavailable-in-tests
kk_derived_from: []
kk_relates_to:
  - practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks
kk_depends_on: []
kk_confidence: high
---
The project Vitest configuration uses the `node` environment — no jsdom. Browser-only APIs (`localStorage`, `matchMedia`, `document`, `window`) are not available in any unit test file.

Code that uses browser APIs at runtime must expose a pure, browser-free interface for unit testing. For example, `src/web/theme/theme.ts` exports `parseTheme` and `resolveTheme` as pure functions (fully testable in node), while the DOM-touching `applyTheme()` and `subscribeToSystem()` are exercised only via Playwright e2e.

Adding jsdom to the Vitest config is not the solution — the project deliberately avoids it. Browser-behavior coverage belongs in Playwright e2e tests (`@playwright/test`, run via `npm run test:e2e`).

<!-- kk:related:start -->
# Related

- Related: [practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks](/testing/practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks.md)
<!-- kk:related:end -->
