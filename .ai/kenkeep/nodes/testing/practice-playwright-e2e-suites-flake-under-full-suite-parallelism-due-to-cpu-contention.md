---
type: practice
title: Playwright e2e suites flake under full-suite parallelism due to CPU contention
description: >-
  Browser suites use at most two workers and half the available CPUs to avoid
  shared-host contention. Diagnose timeouts in isolation before retrying a suite.
tags:
  - web
  - testing
  - playwright
  - e2e
  - flakiness
  - pre-commit
kk_schema_version: 3
kk_id: >-
  practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention
kk_derived_from: []
kk_relates_to:
  - >-
    practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution
kk_depends_on: []
kk_confidence: high
---
High browser concurrency can starve suites of CPU and produce timeouts in otherwise fast tests. `playwright.config.ts` caps workers at two and half the CPUs available to the process, with a minimum of one. The standard `npm test` and pre-commit hook use that cap.

Diagnosis: run the suspected failing test in isolation (`npx playwright test <test-file>`). If it passes in 2–3s alone but times out under the full suite, the failure is load-induced contention.

After reproducing and resolving a failure in isolation, run the full suite with the normal worker cap. Keep the commit hooks enabled.

<!-- kk:related:start -->
# Related

- Related: [practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution](../git/practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md)
<!-- kk:related:end -->
