---
type: practice
title: >-
  Web routes and API resolve plans by composite {id}--{slug} directory name, not
  numeric id alone
description: >-
  The serve API and SPA router use the composite {id}--{slug} directory name as
  the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
tags:
  - routing
  - serve
  - security
  - plan-id
  - spa
kk_schema_version: 3
kk_id: >-
  practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric
kk_derived_from: []
kk_relates_to:
  - map-src-serve-archive-ts-archiveplan-operation
kk_depends_on: []
kk_confidence: high
---
Plan identity in the website layer uses the composite `{id}--{slug}` directory name (as `PlanSummary.name`) as the routing and lookup key, not the numeric frontmatter `id` alone. Changed in Plan 103 to address cross-worktree plan ID collisions undetectable at git-merge time.

Numeric-only URLs (`/plans/28`) intentionally 404; only composite-key URLs (`/plans/28--workspace-data-layer`) are valid. The numeric `id` is retained in frontmatter for display and sort purposes only — do not change it to a string or lexicographic sort will regress.

Traversal hardening: the URL segment feeds plan lookup via enumerate-and-match (`getAllPlans → find(p => p.name === …)`), never by joining the raw segment into a filesystem path. Shape-allowlist validation (reject `/`, `\`, `..`, empty) guards the segment before lookup.

<!-- kk:related:start -->
# Related

- Related: [map-src-serve-archive-ts-archiveplan-operation](/serve/map-src-serve-archive-ts-archiveplan-operation.md)
<!-- kk:related:end -->
