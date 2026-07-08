---
type: practice
title: Do not use --no-verify to skip git commit hooks
description: >-
  Bypassing commit hooks with --no-verify hides real breakage and triggers an
  approval prompt that halts autonomous runs.
tags:
  - git
  - commit
  - pre-commit
  - hooks
kk_schema_version: 3
kk_id: practice-do-not-use-no-verify-to-skip-git-commit-hooks
kk_derived_from: []
kk_relates_to:
  - >-
    practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution
kk_depends_on: []
kk_confidence: high
---
Never pass `--no-verify` (or otherwise bypass) the project's git commit hooks. The pre-commit hook is a quality gate — it runs `npm test` and related checks — so skipping it lets genuinely broken code land while the commit appears green, hiding the failure rather than fixing it.

Bypassing is also self-defeating during agentic execution: `--no-verify` is a flagged action that requires user approval, which interrupts and kills an otherwise autonomous run. The correct response to a failing hook is to fix the underlying failure, or — when the tree is intentionally partial mid-execution — to batch all changes into a single end-of-run commit that passes the full suite (see [[practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution]]).

<!-- kk:related:start -->
# Related

- Related: [practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution](/git/practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md)
<!-- kk:related:end -->
