---
type: map
title: CLI exposes only init and serve commands
description: >-
  Running strikethroo --help lists only init and serve; there are no
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
`src/cli.ts` registers only two commands: `init` and `serve`. Running `strikethroo --help` lists exactly those; invoking `status` or `plan show 1` hits the unknown-command handler and exits 1.

There is no CLI visualization/management surface — plan inspection and management are owned by the Agent Skills layer, not the CLI.

<!-- kk:related:start -->
# Related

- Related: [map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix](/skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md)
<!-- kk:related:end -->
