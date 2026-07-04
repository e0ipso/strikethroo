---
type: map
title: parseBlueprintPhases slices blueprint section to end-of-document
description: >-
  The blueprint parser slices from ## Execution Blueprint to EOF, so an appended
  ## Execution Summary with Task NN bullets is miscounted as task references in
  the last phase.
tags:
  - serve
  - blueprint
  - parser
  - derivation
  - gotcha
kk_schema_version: 3
kk_id: map-parseblueprintphases-slices-blueprint-section-to-end-of-document
kk_derived_from: []
kk_relates_to:
  - practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter
kk_depends_on: []
kk_confidence: high
---
`parseBlueprintPhases` in `src/serve/derivation.ts` extracts the blueprint region by slicing from the `## Execution Blueprint` heading to **end of document**. It does not stop at the next `##` heading.

This means any content appended after the blueprint — most notably the `## Execution Summary` section that the execute-blueprint skill appends on completion — falls inside the last phase's parse region. Any bulleted line matching `TASK_REF_RE` in that summary text is treated as a task reference and inflates the phase's task count.

The symptom is a mismatch between the number of task files on disk and the count displayed in the Plan Detail rail (e.g. 4 task files but 5 rail tasks). The principled fix is to bound the parser slice to the next `##` heading rather than EOF.

<!-- kk:related:start -->
# Related

- Related: [practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter](/serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md)
<!-- kk:related:end -->
