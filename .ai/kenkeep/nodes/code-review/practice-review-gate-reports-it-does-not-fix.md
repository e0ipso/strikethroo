---
type: practice
title: >-
  The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on
  a finding
description: >-
  The gate runs once after POST_EXECUTION, records findings, and applies
  nothing. If you act on a finding, re-run POST_EXECUTION in full before
  declaring complete.
tags:
  - review-gate
  - ordering
  - mechanical-gates
  - report-only
kk_schema_version: 3
kk_id: practice-review-gate-reports-it-does-not-fix
kk_derived_from: []
kk_relates_to:
  - map-model-optional-dispatch-reviewer-harness-omits-model
  - practice-optional-by-absence-new-files-absent-means-feature-off
  - practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore
kk_depends_on: []
kk_confidence: high
---
The code review gate runs **after** `POST_EXECUTION` reports green, and it is terminal: once per plan, never per phase and never per task.

It **reports; it does not decide**. A reviewer on a second harness critiques the cumulative diff, the findings are validated against the vendored XSD, and they are written to `<plan-dir>/review/`. Nothing is applied automatically. The implementer reads `review.xml` and chooses what to act on.

```
Phase N completes
    ↓
POST_EXECUTION (lint + tests + Self Validation)
    ↓ (green)
CODE_REVIEW: one review, findings certified and recorded
    ↓
implementer reads review.xml and decides what to fix
    ↓ (if anything was fixed)
POST_EXECUTION re-run in full, because the fix invalidated the prior green
    ↓ (green)
Execution summary and archival
```

## Why the POST_EXECUTION re-run comes after the fix

A fix invalidates the prior green build. If a change touches `foo.ts`, the tests on `foo.ts` and its call graph have to run again. The full re-run (lint + tests + Self Validation) is the only reliable catcher for a fix that breaks code outside the reviewed diff, so it is the mechanical gate, not the review, that catches transitive breakage.

The review itself does not run again. There is no re-verification pass and no second opinion on your fix.

## What this gate deliberately does not have

Do not reintroduce any of these without first reintroducing the automatic fix they existed to guard:

- **No severity or confidence floors.** Both attributes are advisory triage labels that help a reader sort the review. Nothing branches on them, nothing is filtered out before the implementer sees it, and there is therefore no threshold for a reviewer to game by inflating a `minor` into a `major`.
- **No round budget and no loop.** The gate runs once, so there is nothing to bound. `MAX_REVIEW_ROUNDS` and the hook's round-budget line are both gone.
- **No `actionable` / `recorded` partition.** Every finding is recorded.
- **No `<suggestion>` from an LLM reviewer.** The element exists so a *human* reviewer can hand over exact replacement text that gets applied verbatim. An LLM's replacement text applied without a human read is precisely what this design gave up.

These all existed to make one decision safely: what may be auto-applied to working code unattended. Once nothing is auto-applied, that decision is gone and the apparatus that guarded it decides nothing.

## The one compiled guarantee

An uncertified review is never reported as a clean one. `_verdictFor` in `src/skill-scripts/code-review.ts` returns `review-recorded` only for an `evaluated` outcome. A findings document that is absent, schema-invalid, or unvalidatable because `xmllint` is missing stays `review-failed` and exits 1. Finding counts never affect the exit code, because the gate does not judge findings.

## Scope is anchored to the base commit, not HEAD

The reviewed diff is a two-dot `git diff <base>` from the commit recorded before phase execution against the **working tree**, never `base...HEAD`. The uncommitted post-execution cleanup is exactly what the gate exists to see, and `base...HEAD` would miss it.
