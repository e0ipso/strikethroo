---
schema_version: 2
id: map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles
title: 'SPA vendor styles: five retained CSS files under src/web/vendor/styles/'
kind: map
tags:
  - spa
  - styles
  - tailwind
  - tokens
  - vendor
derived_from: []
relates_to:
  - >-
    map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency
confidence: high
summary: >-
  After the Plan 102 Tailwind migration, the CSS foundation is exactly five
  files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All
  component/screen CSS deleted.
---
After the Plan 102 Tailwind migration, the only CSS files under `src/web/vendor/styles/` are:
- `index.css` — imports Tailwind, `@tailwindcss/typography`, the `@custom-variant dark`, and the four files below
- `fonts.css` — self-hosted `@font-face` declarations
- `tokens.css` — the `@theme` block (all palette/status/border/shadow/radius/font tokens) plus the `.dark { --color-*: … }` token-swap block
- `base.css` — minimal reset and base type styles
- `mermaid.css` — scoped rules for rendered-mermaid SVG internals that Tailwind utilities cannot reach

All component/screen CSS files (app-shell, plans, detail, board-graph, archive, customize, customize-grid, editorial, interactive, prose) have been deleted. Components now emit Tailwind utility classes directly.
