---
type: practice
title: Keep comment prose terse and single-sourced
description: >-
  Do not write long doc comments or repeat the same rationale across call sites
  and file copies. State it once where it belongs.
tags:
  - comments
  - code-style
  - documentation
  - xsd
  - prose
kk_schema_version: 3
kk_id: practice-keep-comment-prose-terse-and-single-sourced
kk_derived_from: []
kk_relates_to:
  - practice-documentation-captures-current-state-only
kk_depends_on: []
kk_confidence: high
---
A doc comment says what the code cannot say and stops. A rationale is stated once, at the place that owns it, and other places point to it instead of restating it.

Observed on the review-gate branch (2026-09-02): `src/skill-scripts/code-review.ts` carried multi-paragraph doc comments restating "an uncertified review is never reported as clean" at several helpers. The three byte-identical copies of `self-review-v2.xsd` (`templates/strikethroo/config/schemas/`, `src/__tests__/fixtures/serve-workspace/`, `src/capture/fixtures/capture-workspace/`) each received the same ~30-line annotation rewrite; since the copies must stay identical, annotation prose in the schema costs three times its length on every edit.

When reviewing or writing code here: cut a comment that repeats a neighbouring comment, the function name, or a docs paragraph. Keep schema annotations to the contract, not the essay. Treat repeated rationale as a signal that it belongs in one place (AGENTS.md, docs/why.md, or a single owning comment) with references elsewhere.

<!-- kk:related:start -->
# Related

- Related: [practice-documentation-captures-current-state-only](/conventions/practice-documentation-captures-current-state-only.md)
<!-- kk:related:end -->
