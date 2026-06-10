---
schema_version: 2
id: >-
  practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution
title: >-
  Pre-commit test hook prevents per-phase commits during multi-phase plan
  execution
kind: practice
tags:
  - pre-commit
  - testing
  - phase
  - commits
derived_from: []
relates_to: []
confidence: high
summary: >-
  The pre-commit hook runs npm test; mid-execution the source is in a broken
  state, so per-phase commits fail until all phases complete.
---
The project's pre-commit hook runs `npm test`. During multi-phase blueprint execution, the source tree is intentionally partial between phases (e.g. renamed template paths not yet reflected in the CLI source). This means per-phase commits are not viable — they will fail the hook. The accepted pattern is to batch all changes into a single end-of-run commit once all phases complete and the full test suite passes.
