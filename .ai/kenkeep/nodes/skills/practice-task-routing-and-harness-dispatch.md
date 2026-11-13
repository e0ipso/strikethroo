---
type: practice
title: 'Task routing: one profile writer, strict dispatch'
description: >-
  route-task-execution.cjs alone writes execution_profile. Dispatch never
  silently falls back on bad metadata.
tags:
  - execution-routing
  - dispatch
kk_schema_version: 3
kk_id: practice-task-routing-and-harness-dispatch
kk_derived_from: []
kk_relates_to:
  - practice-config-yaml-is-local-and-empty-means-unconfigured
  - map-model-optional-dispatch-reviewer-harness-omits-model
kk_depends_on: []
kk_confidence: high
---
`route-task-execution.cjs` is the only writer of a task's `execution_profile`. `dispatch-task-execution.cjs` picks a target at dispatch. External harnesses are ineligible unless `allow_external_harness_execution` is `true`.

Unreadable task frontmatter fails with exit 2 instead of falling back to native defaults. `launched-success` only means the child exited zero; task status decides completion.

Harness `cli_args` pass through byte-for-byte with `shell: false`. Like hooks and the selector script, they are unsandboxed executable authority.

Resolution captures an external task's path, content digest, workspace, IDs, model settings, and exact CLI arguments. `execute` consumes only that request. Any task edit between resolution and launch requires fresh resolution; configuration edits affect future resolutions. The single-task skill marks in-progress before resolution, and blueprint assignment hooks finish before resolution. Workers can edit their task after launch. Executable lookup and credentials still use the launch environment.

Profile names are exact non-empty strings. Whitespace-only names fail before task writes; names containing other characters retain their surrounding whitespace through config editing, assignment, and dispatch.

<!-- kk:related:start -->
# Related

- Related: [practice-config-yaml-is-local-and-empty-means-unconfigured](practice-config-yaml-is-local-and-empty-means-unconfigured.md)
- Related: [map-model-optional-dispatch-reviewer-harness-omits-model](../code-review/map-model-optional-dispatch-reviewer-harness-omits-model.md)
<!-- kk:related:end -->
