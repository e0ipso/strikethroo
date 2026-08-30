---
type: map
title: >-
  Model-optional dispatch: reviewer harness omits --model to use CLI defaults
description: >-
  Harness discovery yields a harness, not a model id. Reviewer dispatch omits
  `--model`; execution_routing dispatch still requires it. Harness probes work
  the same way for the same reason.
tags:
  - dispatch
  - harness-discovery
  - model-selection
kk_schema_version: 3
kk_id: >-
  map-model-optional-dispatch-reviewer-harness-omits-model
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---

`src/skill-scripts/shared/harness-discovery.ts` loads the local harness invocation configuration, checks every supported harness, and returns responsive harness identifiers such as `"claude"` or `"gemini"`. The current harness is excluded from reviewer candidates. Discovery also returns the exact configured `cli_args` that made each external candidate ready, but it does not choose a model.

`src/skill-scripts/shared/harness-availability.ts` runs external readiness with the same adapter and ordered `cli_args` as dispatch. The probe uses a disposable Git workspace and asks the harness to create a nonce-bearing file. A zero exit without that exact file is unavailable. The probe omits a model because it proves that the configured harness invocation can act, not that a particular model id is accepted.

`runReview()` chooses the first reviewer candidate and passes its `cli_args` to `dispatchReview()`. `ReviewDispatchRequest` has no model or reasoning-effort fields, so `buildReviewCommand()` lets the external CLI use its configured default model. There is no `--model-optional` flag.

Task execution keeps a stricter contract. `RoutedDispatchRequest` requires an exact `model`, and the task-routing call site cannot omit it. `external-dispatch.ts` uses one adapter table for both paths and adds `--model <id>` only when the request contains a model.

Discovery reuses `.ai/strikethroo/runtime/harness-availability.json`. Available results live for 30 minutes and unavailable results for 5 minutes; probes time out after 20 seconds. The cache identity includes the harness, resolved executable, ordered-argument hash, configuration normalization version, and probe-registry version.
