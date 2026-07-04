---
type: map
title: >-
  CustomizeDetailRoute: title appends singular kind (hook or template, not
  hooks/templates)
description: >-
  The Customize detail page title formats as '<id> hook' or '<id> template'. The
  breadcrumb still uses the plural kind.
tags:
  - customize
  - spa
  - ui
kk_schema_version: 3
kk_id: >-
  map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: medium
---
In `src/web/customize/CustomizeDetailRoute.tsx`, the page title is formatted as `<id> hook` or `<id> template` by converting the plural `kind` (`hooks`/`templates`) to singular. The breadcrumb still uses the plural `kind`. The description (from the build-time descriptions registry) renders below the title and above the editor when present.
