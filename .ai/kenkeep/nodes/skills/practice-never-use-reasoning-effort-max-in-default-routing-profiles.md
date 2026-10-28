---
type: practice
title: Never use reasoning effort max in default routing profiles
description: >-
  The shipped config template caps reasoning effort at xhigh, for routing
  targets and harness cli_args defaults alike. Never max.
tags:
  - execution-routing
  - config-yaml
  - reasoning-effort
  - defaults
kk_schema_version: 3
kk_id: practice-never-use-reasoning-effort-max-in-default-routing-profiles
kk_derived_from:
  - '3c9e5246-e863-4a07-80c3-872c421a4fa3:practice:0'
kk_relates_to:
  - practice-task-routing-and-harness-dispatch
  - practice-config-yaml-is-local-and-empty-means-unconfigured
kk_depends_on: []
kk_confidence: medium
---
The default config template (`templates/strikethroo/config/config.yaml`) never sets reasoning effort `max`. This covers the `reasoning_effort` of every `execution_routing.profiles` target and the effort flags in the harness `cli_args` defaults (Claude `--effort`, Codex `--config model_reasoning_effort=...`). Use `xhigh` as the ceiling, including for the `complex-architecture` profile.

When model or effort defaults change, keep the highest tier at `xhigh` and update the matching assertions in `src/__tests__/cli.integration.test.ts`.

<!-- kk:related:start -->
# Related

- Related: [practice-task-routing-and-harness-dispatch](practice-task-routing-and-harness-dispatch.md)
- Related: [practice-config-yaml-is-local-and-empty-means-unconfigured](practice-config-yaml-is-local-and-empty-means-unconfigured.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] 3c9e5246-e863-4a07-80c3-872c421a4fa3:practice:0
<!-- kk:citations:end -->
