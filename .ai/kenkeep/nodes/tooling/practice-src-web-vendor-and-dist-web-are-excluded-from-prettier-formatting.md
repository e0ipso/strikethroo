---
schema_version: 2
id: practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting
title: src/web/vendor/ and dist-web/ are excluded from Prettier formatting
kind: practice
tags:
  - prettier
  - vendor
  - css
  - build
derived_from: []
relates_to: []
confidence: high
summary: >-
  Vendored CSS under src/web/vendor/ must not be reformatted. Both
  src/web/vendor/ and dist-web/ are excluded via .prettierignore.
---
`.prettierignore` excludes `src/web/vendor/` and `dist-web/`. The vendored CSS files under `src/web/vendor/` are maintained as design-source files and must not diverge from the upstream source via reformatting. `dist-web/` is generated build output.
