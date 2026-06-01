---
schema_version: 1
id: >-
  practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention
title: Playwright e2e suites flake under full-suite parallelism due to CPU contention
kind: practice
tags:
  - web
  - testing
  - playwright
  - e2e
  - flakiness
  - pre-commit
derived_from: []
relates_to:
  - >-
    practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution
confidence: high
summary: >-
  Under default workers, parallel Playwright/Chromium processes starve each
  other; random tests timeout. Run --workers=2 to prove genuine green.
---
When running the full test suite with the default `workers` setting (~50% of cores), the 8+ parallel Playwright/Chromium suites compete for CPU and a random e2e test trips its 30s timeout each run. The timeout victim rotates — a different test fails each run. This is environmental flakiness, not a code regression.

Diagnosis: run the suspected failing test in isolation (`npx playwright test <test-file>`). If it passes in 2–3s alone but times out under the full suite, the failure is load-induced contention.

Verification protocol before `--no-verify`: confirm genuine green via `npx playwright test --workers=2`. Never use `--no-verify` solely on repeated contention failures without first confirming green with constrained workers. The standard pre-commit hook (`npm test`) does not cap parallelism, so it is inherently flaky under concurrent agent workloads on shared hardware.
