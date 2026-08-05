---
type: practice
title: Add every new test file to the manual include list in vitest.config.ts
description: >-
  vitest.config.ts enumerates test files explicitly rather than by glob, so an
  unlisted new test file is never collected and silently never runs.
tags:
  - testing
  - vitest
  - config
  - gotcha
kk_schema_version: 3
kk_id: >-
  practice-add-every-new-test-file-to-the-manual-include-list-in-vitest-config-ts
kk_derived_from:
  - 'ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:1'
kk_relates_to:
  - >-
    practice-vitest-test-suite-runs-in-node-environment-browser-apis-unavailable-in-tests
kk_depends_on: []
kk_confidence: high
---
The `include` array in `vitest.config.ts` is an explicit, hand-maintained list of test file paths, not a glob. A new test file that is not added to that array is never collected: the suite stays green, the run count barely moves, and the new coverage is silently absent.

Add the path to the include array in the same change that adds the test file. When a newly written test appears to pass suspiciously fast, or the reported test count did not grow, check that the file is listed before trusting the result.

New test files also raise the coverage denominator, so verify the global thresholds in `vitest.config.ts` still pass after wiring one in.

<!-- kk:related:start -->
# Related

- Related: [practice-vitest-test-suite-runs-in-node-environment-browser-apis-unavailable-in-tests](/testing/practice-vitest-test-suite-runs-in-node-environment-browser-apis-unavailable-in-tests.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:1](ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:1)
<!-- kk:citations:end -->
