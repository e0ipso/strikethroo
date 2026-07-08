---
type: practice
title: 'E2e tests must use stable semantic selectors, not Tailwind utility class names'
description: >-
  Playwright e2e assertions must target role, text, aria-*, or data-testid —
  never Tailwind utility class names, which change during styling iterations.
tags:
  - testing
  - e2e
  - playwright
  - selectors
  - tailwind
kk_schema_version: 3
kk_id: >-
  practice-e2e-tests-must-use-stable-semantic-selectors-not-tailwind-utility-class-names
kk_derived_from: []
kk_relates_to:
  - >-
    practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f
kk_depends_on: []
kk_confidence: high
---
Playwright e2e tests must not assert on Tailwind utility class names (`.flex`, `.rounded-card`, `.text-ink`, etc.). Utility classes change during styling refactors without changing behavior, so class-based assertions produce false failures.

Stable selector strategies in preference order:
1. ARIA roles and accessible names: `getByRole('button', { name: '…' })`
2. Text content: `getByText('…')`
3. ARIA attributes: `aria-current`, `aria-selected`, `aria-label`
4. `data-testid` attributes on collection containers (e.g. `data-testid="plans-empty"`, `data-testid="config-card"`, `data-testid="archive-row"`)

When a styling migration removes CSS classes that tests depended on, add minimal `data-testid` or `aria-*` attributes to the component rather than asserting on utility classes.

<!-- kk:related:start -->
# Related

- Related: [practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f](/web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md)
<!-- kk:related:end -->
