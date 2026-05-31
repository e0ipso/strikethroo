---
schema_version: 1
id: map-plan-95-wire-and-fix-serve-ui-interactions
title: Plan 95 — wire and fix serve UI interactions
kind: map
tags:
  - web
  - plans
  - ui
  - plan-95
derived_from: []
relates_to: []
confidence: high
summary: >-
  Plan 95 addresses unwired serve SPA interactions: board-first default, pointer
  cursors, clickable breadcrumbs, list sorting, archive filters, detail layout.
---
Plan 95 (`plans/95--wire-and-fix-serve-ui-interactions/`) captures a comprehensive set of UI interaction fixes for the serve SPA: board-first default view, `cursor: pointer` on all clickables, navigable breadcrumbs, Show/Hide done toggle, interactive table sorting on Plans List and Archive, archive date-range filter and By Month tab, centered detail layout with right blueprint rail, done-task strikethrough in blueprint view, Tasks tab replacing the old Execute tab, and compact graph labels.

Scope is strictly `src/web/` — serve API and workspace model are untouched.
