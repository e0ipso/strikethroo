---
schema_version: 1
id: >-
  practice-jest-test-suite-runs-in-node-environment-browser-apis-unavailable-in-tests
title: Jest test suite runs in node environment — browser APIs unavailable in tests
kind: practice
tags:
  - testing
  - jest
  - browser
  - dom
  - node
derived_from: []
relates_to: []
confidence: high
summary: >-
  Jest is configured with testEnvironment: node; localStorage, matchMedia, and
  document are unavailable. Isolate DOM-touching code behind pure interfaces.
---
The project jest configuration uses `testEnvironment: node` — no jsdom. Browser-only APIs (`localStorage`, `matchMedia`, `document`, `window`) are not available in any test file.

Code that uses browser APIs at runtime must expose a pure, browser-free interface for unit testing. For example, `src/web/theme/theme.ts` exports `parseTheme` and `resolveTheme` as pure functions (fully testable in node), while the DOM-touching `applyTheme()` and `subscribeToSystem()` are exercised only via Playwright e2e.

Adding jsdom to the jest config is not the solution — the project deliberately avoids it. Browser-behavior coverage belongs in Playwright e2e tests.
