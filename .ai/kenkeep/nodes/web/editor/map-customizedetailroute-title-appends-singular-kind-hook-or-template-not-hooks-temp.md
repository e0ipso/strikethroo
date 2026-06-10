---
schema_version: 2
id: >-
  map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp
title: >-
  CustomizeDetailRoute: title appends singular kind (hook or template, not
  hooks/templates)
kind: map
tags:
  - customize
  - spa
  - ui
derived_from: []
relates_to: []
confidence: medium
summary: >-
  The Customize detail page title formats as '<id> hook' or '<id> template'. The
  breadcrumb still uses the plural kind.
---
In `src/web/customize/CustomizeDetailRoute.tsx`, the page title is formatted as `<id> hook` or `<id> template` by converting the plural `kind` (`hooks`/`templates`) to singular. The breadcrumb still uses the plural `kind`. The description (from the build-time descriptions registry) renders below the title and above the editor when present.
