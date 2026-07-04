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
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The Archive UI control is a confirmation-gated button that appears on `done`-state plans across both Plans views (Board, Cards). It uses the existing `Modal` primitive via an `ArchivePlanModal` component. On confirmation it calls `archivePlan()` in `src/web/data/api.ts`, and the SSE stream drives the automatic UI refresh after the server-side move completes.
