---
type: map
title: Archive UI control — confirmation-gated Archive button on done plans
description: >-
  Done plans get an Archive button wired to ArchivePlanModal; POST
  /api/plans/:id/archive triggers SSE-driven UI refresh.
tags:
  - web
  - plans
  - archive
  - ui
kk_schema_version: 3
kk_id: map-archive-ui-control-confirmation-gated-archive-button-on-done-plans
kk_derived_from: []
kk_relates_to:
  - map-src-serve-archive-ts-archiveplan-operation
kk_depends_on: []
kk_confidence: high
---
The Archive UI control is a confirmation-gated button that appears on `done`-state plans in both Plans views, Board and Cards. It uses the existing `Modal` primitive through `ArchivePlanModal`.

The modal passes the plan's composite `name`, `{id}--{slug}`, to `archivePlan()` in `src/web/data/api.ts`. The client URL-encodes that key in `POST /api/plans/<name>/archive`; the numeric `id` is display text only. On success the modal closes, and the server's SSE `changed` event makes the mounted plan resources refetch so the plan disappears from Plans and appears under Archive.

<!-- kk:related:start -->
# Related

- Related: [map-src-serve-archive-ts-archiveplan-operation](/serve/map-src-serve-archive-ts-archiveplan-operation.md)
<!-- kk:related:end -->
