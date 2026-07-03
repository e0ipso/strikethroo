---
schema_version: 2
id: >-
  map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed
title: CLI exposes only init and serve commands
kind: map
tags:
  - cli
  - architecture
derived_from: []
relates_to: []
confidence: high
summary: >-
  Running strikethroo --help lists only init and serve; there are no
  visualization/management (status, plan) commands.
---
`src/cli.ts` registers only two commands: `init` and `serve`. Running `strikethroo --help` lists exactly those; invoking `status` or `plan show 1` hits the unknown-command handler and exits 1.

There is no CLI visualization/management surface — plan inspection and management are owned by the Agent Skills layer, not the CLI.
