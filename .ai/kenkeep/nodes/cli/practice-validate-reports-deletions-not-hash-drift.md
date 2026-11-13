---
type: practice
title: 'validate reports deleted files, never hash drift'
description: >-
  validateWorkspace avoids findStrikethrooRoot, treats edits as customization,
  and applies strict field policy over shared YAML parsing.
tags:
  - validate
  - frontmatter
kk_schema_version: 3
kk_id: practice-validate-reports-deletions-not-hash-drift
kk_derived_from: []
kk_relates_to:
  - practice-optional-by-absence-new-files-absent-means-feature-off
  - practice-init-refresh-kept-file-keeps-its-old-baseline
kk_depends_on: []
kk_confidence: high
---
`validateWorkspace` in `src/validation/` takes a resolved root and never calls `findStrikethrooRoot`, which exits on schema skew, the case `validate` exists to report.

A hash mismatch against `.init-metadata.json` is user customization, not a finding. Only deleted files are, minus `OPTIONAL_BY_ABSENCE`.

`strict-pass.ts`, execution, and the viewer share `readYamlFrontmatter` in `shared/task-frontmatter.ts`. Its result distinguishes absent, malformed, and parsed metadata; strict validation separately checks missing fields and their types. Keep that policy separate from tolerant display and discovery. Discovery recovers named plans with closed metadata blocks from directory/filename IDs when metadata is invalid or lacks an ID. Allocation also reserves IDs in existing names, including unfinished plan directories. Nested YAML fields and scalar text never supply a root ID.

`TASK_STATUSES` in `shared/task-file.ts` supplies the strict validator's status list. Keep it consistent with the `TASK_TEMPLATE.md` comment.
