---
schema_version: 1
id: >-
  map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed
title: >-
  CLI exposes only init and serve commands; all visualization/management
  commands removed
kind: map
tags:
  - cli
  - architecture
derived_from: []
relates_to: []
confidence: high
summary: >-
  status and plan commands were removed in plan 81. Running strikethroo --help
  lists only init and serve.
---
Plan 81 (`remove-cli-visualization-commands`) deleted `src/status.ts`, `src/plan.ts`, and `src/plan-utils.ts`, stripped the `status` and `plan` command trees from `src/cli.ts`.

The rationale: these commands duplicated functionality the Agent Skills layer already owns. Running `strikethroo --help` lists only `init` and `serve`. Invoking `status` or `plan show 1` hits the unknown-command handler and exits 1.
