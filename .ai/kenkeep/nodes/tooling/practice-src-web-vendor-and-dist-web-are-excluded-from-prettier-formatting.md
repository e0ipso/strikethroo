---
type: practice
title: src/web/vendor/ and dist-web/ are excluded from Prettier formatting
description: >-
  Vendored CSS under src/web/vendor/ must not be reformatted. Both
  src/web/vendor/ and dist-web/ are excluded via .prettierignore.
tags:
  - prettier
  - vendor
  - css
  - build
kk_schema_version: 3
kk_id: practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
`.prettierignore` excludes `src/web/vendor/` and `dist-web/`. The vendored CSS files under `src/web/vendor/` are maintained as design-source files and must not diverge from the upstream source via reformatting. `dist-web/` is generated build output.
