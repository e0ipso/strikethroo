---
type: map
title: The blueprint parser is bounded to its own section
description: >-
  parseBlueprintPhases reads from ## Execution Blueprint only as far as the next
  peer ## heading, so an appended ## Execution Summary cannot contribute task
  references to the last phase.
tags:
  - serve
  - blueprint
  - parser
  - derivation
  - parser-contract
kk_schema_version: 3
kk_id: map-parseblueprintphases-slices-blueprint-section-to-end-of-document
kk_derived_from: []
kk_relates_to:
  - practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter
kk_depends_on: []
kk_confidence: high
---
`parseBlueprintPhases` in `src/skill-scripts/shared/blueprint-parse.ts` extracts the blueprint region from the `## Execution Blueprint` heading up to the next **peer** `##` heading, or to end of document when none follows. `###` subsections stay inside, so a blueprint may carry its own `### Post-phase Actions` and `### Execution Summary`. Within the region each `### Phase` segment ends at the next phase heading.

The boundary is what makes the region stable as a plan grows. `st-execute-blueprint` appends an `## Execution Summary` section after execution, and that section ends the blueprint rather than joining the last phase, so a bulleted line there matching `TASK_REF_RE` is not read as a task reference.

The failure this prevents is a silent one: an inflated phase would disagree with the task files on disk, and both the Plan Detail rail and `check-phase-readiness` would report the phantom task. Keep the peer-heading bound when editing the region logic, and keep the fixture that appends a summary carrying `Task NN` bullets.

<!-- kk:related:start -->
# Related

- Related: [practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter](/serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md)
<!-- kk:related:end -->
