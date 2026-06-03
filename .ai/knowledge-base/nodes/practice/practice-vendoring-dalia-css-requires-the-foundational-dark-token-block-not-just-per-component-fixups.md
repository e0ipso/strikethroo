---
schema_version: 1
id: >-
  practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups
title: >-
  Dark mode requires both the foundational .dark token block and per-component
  fixups, both in tokens.css
kind: practice
tags:
  - web
  - css
  - dalia
  - dark-mode
  - vendoring
  - tokens
derived_from: []
relates_to:
  - >-
    map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency
confidence: high
summary: >-
  Both the @theme token block and the .dark palette-swap must live in
  tokens.css. Deleting CSS files without relocating these blocks silently breaks
  dark mode.
---
Dark mode in the SPA requires two layers that must coexist in `src/web/vendor/styles/tokens.css`:

1. **Foundational `@theme` block** — defines all `--color-*` Tailwind token values. Without this, token-backed utilities resolve to nothing.
2. **`.dark { --color-*: … }` swap block** — redefines the palette for dark mode. Without this, applying `.dark` to `document.documentElement` has no effect; all token-backed utilities stay at light values.

In the initial vendoring, only per-component `.dark .foo { }` fixups were carried; the foundational `.dark` swap block was missing, so dark mode appeared to do nothing. Both layers are now in `tokens.css` (moved from the deleted `app-shell.css` during the Tailwind migration).

If you delete or rename any CSS file under `src/web/vendor/styles/`, grep it for `:root {` and `.dark {` token-definition blocks before removing. Relocate any found definitions to `tokens.css`. Losing the foundational `.dark` swap block silently breaks dark mode even when the build passes.
