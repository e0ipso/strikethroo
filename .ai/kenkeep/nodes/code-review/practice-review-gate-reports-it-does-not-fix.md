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
kk_derived_from:
  - >-
    .ai/strikethroo/plans/116--streamline-review-gate-contract-and-prompt/tasks/03--clean-review-gate-terminology.md
kk_relates_to:
  - map-model-optional-dispatch-reviewer-harness-omits-model
  - practice-optional-by-absence-new-files-absent-means-feature-off
  - practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore
kk_depends_on: []
kk_confidence: high
---
The code review gate runs after `POST_EXECUTION` reports green, and it is terminal: once per plan, never per phase and never per task.

It reports; it does not decide what to fix. A reviewer on a second harness critiques the cumulative diff. The gate validates the delivered findings against the vendored XSD and writes the result under the flat `<plan-dir>/review/` directory. Nothing is applied automatically. The implementer reads `review.xml` and chooses what to act on. `findings.json` records the evaluation status and, after certification, the parsed findings.

```text
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

## The emitted result contract

Every emitted JSON result has top-level `action` and `detail`. One compiled classification produces both `action` and the process exit code, so `action: "continue"` matches exit 0 and `action: "halt"` matches a nonzero exit. Findings never change that classification. The implementer, not the gate, judges them.

A reviewed result retains a small `verdict` object whose `kind` is the certification discriminator:

- `review-recorded` means the findings document was certified. This form alone has top-level `counts`. It continues with exit 0 whether the reviewer raised zero findings or many.
- `review-failed` means the dispatched review did not certify. It has no counts, halts, and exits 1.

An absent findings document, schema-invalid XML, or a validator that becomes unavailable after dispatch can never be reported as a clean review. The pre-dispatch `xmllint` check is different: if the validator is absent before discovery and dispatch, the gate records a skip and continues without spending an external review. A skip says the gate did not run, not that the diff was clean.

## Why the POST_EXECUTION re-run comes after a fix

A fix invalidates the prior green build. If a change touches `foo.ts`, tests for `foo.ts` and its call graph have to run again. The full POST_EXECUTION re-run, including lint, tests, and Self Validation, catches breakage outside the reviewed diff. The mechanical gate certifies the implementation; the review only reports findings.

The review itself does not run again. There is no reviewer re-check of the fix.

## What this gate deliberately does not have

Do not reintroduce any of these without first reintroducing the automatic fix they once guarded:

- No severity or confidence floors. Both attributes are advisory labels that help a reader sort findings. Nothing branches on them or filters findings before the implementer sees them.
- No round budget and no loop. The gate runs once, so there is nothing to bound.
- No `actionable` and `recorded` partition. Every certified finding is recorded.
- No `<suggestion>` from an LLM reviewer. The element exists so a human reviewer can supply exact replacement text. The gate does not apply that text.

Those controls once answered which findings could be applied to working code without a human decision. The report-only gate makes no such decision.

## Scope is anchored to the base commit, not HEAD

The reviewed scope is a two-dot `git diff <base>` from the commit recorded before phase execution against the working tree, never `base...HEAD`. The gate must see uncommitted post-execution cleanup, which `base...HEAD` would miss.

The scope includes untracked, unignored files through synthesized add-diffs. It excludes paths marked `linguist-generated=true` or `linguist-vendored=true` in `.gitattributes`. The reviewer sees authored source, not generated skill bundles, the release mirror, or vendored schemas.

## Reviewer invocation uses local harness configuration

Discovery probes external harnesses with the ordered `cli_args` from `config/config.yaml`. The selected review dispatch uses those arguments and omits a model override, so the external CLI chooses its configured default model.

<!-- kk:related:start -->
# Related

- Related: [map-model-optional-dispatch-reviewer-harness-omits-model](/code-review/map-model-optional-dispatch-reviewer-harness-omits-model.md)
- Related: [practice-optional-by-absence-new-files-absent-means-feature-off](/code-review/practice-optional-by-absence-new-files-absent-means-feature-off.md)
- Related: [practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore](/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [.ai/strikethroo/plans/116--streamline-review-gate-contract-and-prompt/tasks/03--clean-review-gate-terminology.md](.ai/strikethroo/plans/116--streamline-review-gate-contract-and-prompt/tasks/03--clean-review-gate-terminology.md)
<!-- kk:citations:end -->
