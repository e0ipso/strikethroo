---
type: practice
title: >-
  Vitest integration tests flake under load — re-run isolated before believing a
  failure
description: >-
  profiles.integration and the serve-server SSE-coalescing test are
  load-sensitive; a failure under load that passes isolated is contention, not a
  regression.
tags:
  - testing
  - vitest
  - flakiness
  - integration-tests
kk_schema_version: 3
kk_id: >-
  practice-vitest-integration-tests-flake-under-load-re-run-isolated-before-believing-a-failure
kk_derived_from:
  - 'cf892283-2514-437c-bea8-4b68a535813e:practice:0'
kk_relates_to:
  - >-
    practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention
kk_depends_on: []
kk_confidence: medium
---
Parts of the Vitest suite are load-sensitive rather than deterministic. `src/__tests__/profiles.integration.test.ts` and the SSE change-stream coalescing test in `src/__tests__/serve-server.integration.test.ts` both depend on timing over real filesystem and timer work, and they fail intermittently when the machine is busy — for instance when the pre-commit gate runs alongside other agent workloads.

Diagnosis is the same protocol as the Playwright side: re-run the suspected test in isolation. A pass in isolation immediately after a failure under load is the signature of contention, not evidence of a fix. The victim rotates between runs.

Do not change source to chase such a failure, and do not read it as caused by the diff under test. Confirm genuine green on a quiet machine before concluding anything about the change.

<!-- kk:related:start -->
# Related

- Related: [practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention](/testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [cf892283-2514-437c-bea8-4b68a535813e:practice:0](cf892283-2514-437c-bea8-4b68a535813e:practice:0)
<!-- kk:citations:end -->
