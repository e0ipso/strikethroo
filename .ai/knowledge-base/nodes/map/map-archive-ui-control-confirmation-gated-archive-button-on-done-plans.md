---
schema_version: 1
id: map-archive-ui-control-confirmation-gated-archive-button-on-done-plans
title: Archive UI control — confirmation-gated Archive button on done plans
kind: map
tags:
  - web
  - plans
  - archive
  - ui
derived_from: []
relates_to: []
confidence: high
summary: >-
  Done plans get an Archive button wired to ArchivePlanModal; POST
  /api/plans/:id/archive triggers SSE-driven UI refresh.
---
The Archive UI control is a confirmation-gated button that appears on `done`-state plans across both Plans views (Board, Cards). It uses the existing `Modal` primitive via an `ArchivePlanModal` component. On confirmation it calls `archivePlan()` in `src/web/data/api.ts`, and the SSE stream drives the automatic UI refresh after the server-side move completes.
