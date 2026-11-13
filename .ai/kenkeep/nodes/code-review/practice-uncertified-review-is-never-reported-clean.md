---
type: practice
title: An uncertified review is never reported clean
description: >-
  Only an XSD-certified findings document counts. The orchestrator alone writes
  review.xml from reviewer stdout.
tags:
  - review-gate
  - certification
kk_schema_version: 3
kk_id: practice-uncertified-review-is-never-reported-clean
kk_derived_from: []
kk_relates_to:
  - practice-review-gate-reports-it-does-not-fix
kk_depends_on: []
kk_confidence: high
---
`reviewedFieldsFor` and `_classify` in `code-review.ts` report `review-recorded` only for a findings document the XSD accepted. Everything else is `review-failed`.

The reviewer prints XML to stdout between per-dispatch token delimiters. The orchestrator alone writes `review/review.xml`. DTD declarations are refused before validation. After XSD validation, `xmllint --xpath` reads severity counts and projects finding values with native namespace and entity semantics. Failed counting or projection prevents certification and records an empty findings array. `findings.json` retains the per-finding fields and 400-character summaries.

Git calls go through `execGit` with argv, never a shell. Any failed Git step while collecting the diff is an infrastructure failure, not a smaller scope.

<!-- kk:related:start -->
# Related

- Related: [practice-review-gate-reports-it-does-not-fix](practice-review-gate-reports-it-does-not-fix.md)
<!-- kk:related:end -->
