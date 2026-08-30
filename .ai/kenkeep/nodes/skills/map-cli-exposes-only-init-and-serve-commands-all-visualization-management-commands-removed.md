---
type: map
title: CLI exposes four thin commands and no plan-management surface
description: >-
  src/cli.ts registers init, export profile, serve, and validate; there are no
  visualization/management (status, plan) commands.
tags:
  - cli
  - architecture
kk_schema_version: 3
kk_id: >-
  map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed
kk_derived_from: []
kk_relates_to:
  - map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix
kk_depends_on: []
kk_confidence: high
---
`src/cli.ts` registers four commands: `init`, the nested `export profile`, `serve`, and `validate`. Every action stays thin — it parses flags, delegates to a module, and owns only reporting and the exit code. Invoking `status` or `plan show 1` hits the unknown-command handler and exits 1.

There is no CLI visualization/management surface — plan inspection and management are owned by the Agent Skills layer (and the read-only `serve` viewer), not by CLI subcommands.

<!-- kk:related:start -->
# Related

- Related: [map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix](/skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md)
<!-- kk:related:end -->
