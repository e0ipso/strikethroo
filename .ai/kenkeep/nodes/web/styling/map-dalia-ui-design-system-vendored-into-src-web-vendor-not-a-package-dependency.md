---
type: map
title: >-
  Dalia UI design system: vendored into src/web/vendor/, not a package
  dependency
description: >-
  Dalia UI (@dalia/ui 0.1.0) is unpublished. Components and styles are copied
  into src/web/vendor/styles/ rather than declared as a dependency.
tags:
  - web
  - spa
  - dalia
  - design-system
kk_schema_version: 3
kk_id: >-
  map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The Dalia 'Bold Editorial' design system uses React 18 + Vite 5 + Tailwind v4 (`@theme` tokens) + Base UI + lucide-react, with CSS as source of truth.

Because `@dalia/ui` is unpublished (v0.1.0, pnpm workspace), it cannot be declared as a package dependency. The convention is to **vendor/copy** components and styles directly into this repo (`src/web/vendor/styles/`) and create new components that follow the same principles.
