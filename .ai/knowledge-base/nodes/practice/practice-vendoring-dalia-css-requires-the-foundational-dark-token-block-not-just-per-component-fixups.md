---
schema_version: 1
id: >-
  practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups
title: >-
  Vendoring Dalia CSS requires the foundational .dark token block, not just
  per-component fixups
kind: practice
tags:
  - web
  - css
  - dalia
  - dark-mode
  - vendoring
derived_from: []
relates_to:
  - >-
    map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency
confidence: high
summary: >-
  Only per-component .dark fixups were vendored initially; the foundational
  .dark token-redefinition block was missing, leaving dark mode non-functional.
---
When vendoring Dalia design system CSS into `src/web/vendor/styles/`, two layers are required for dark mode to work:

1. **Foundational block** — a top-level `.dark { }` rule that redefines `--color-*` (Tailwind `@theme`) token values and sets `color-scheme: dark`. Without this, `body` background and all derived `--color-*` aliases stay at light values even when `.dark` is applied to `document.documentElement`.
2. **Per-component fixups** — the `@layer` `.dark .foo { }` rules overriding specific component states.

In the initial vendoring, only the per-component fixups were carried; the foundational block was omitted (acknowledged in the original CSS comment: "DARK-MODE COMPONENT FIXUPS … no theme-switcher UI built here"). Applying `.dark` appeared to do nothing because the primary token layer was never overridden. The fix is in `app-shell.css` (commit `2cbb8fb8`).
