---
type: practice
title: 'config.yaml is local, and empty means unconfigured'
description: >-
  Init tracks config.yaml but gitignores it. hasYamlContent is duplicated in the
  SPA; change both.
tags:
  - config-yaml
  - execution-routing
kk_schema_version: 3
kk_id: practice-config-yaml-is-local-and-empty-means-unconfigured
kk_derived_from: []
kk_relates_to:
  - practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace
kk_depends_on: []
kk_confidence: high
---
`config/config.yaml` is machine-local. `init` tracks its hash, but the workspace `.gitignore` ignores it.

Absent, blank, or comment-only means nothing is configured, in every reader, through `hasYamlContent` in `shared/task-frontmatter.ts`. `src/web/customize/configYaml.ts` keeps its own copy because the SPA cannot import from `src/skill-scripts/`. Change both together.

<!-- kk:related:start -->
# Related

- Related: [practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace](../git/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md)
<!-- kk:related:end -->
