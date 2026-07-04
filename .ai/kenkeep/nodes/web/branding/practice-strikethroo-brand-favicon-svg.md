---
type: practice
title: Strikethroo brand favicon at src/web/public/favicon.svg
description: >-
  Cream Outfit `s` on ink rounded-square with strike-through; embed real glyph
  paths and hex colors only.
tags:
  - web
  - assets
  - favicon
  - brand
  - font
  - svg
kk_schema_version: 3
kk_id: practice-strikethroo-brand-favicon-svg
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The favicon at `src/web/public/favicon.svg` is the Strikethroo compact mark: a cream (`#f7f3ec`) lowercase `s` on an ink (`#19110a`) rounded-square container with a thin strike-through bar. Vite copies `src/web/public/` to `dist-web/` at build time.

Web fonts do not load in favicon contexts, so `<text>` elements with font-family references fall back to system fonts and look wrong. Extract the actual glyph outline path from the vendored font file (e.g. `Outfit-VariableFont_wght.ttf`) using `fontkit`, then embed it as a `<path>` in the SVG. Select regular weight 400 and transform from the font UPM coordinate system (y-up) to the SVG viewBox (y-down, scaled). `fontkit` can be installed transiently in `/tmp` without modifying `package.json`.

Use hex color values only — `oklch()` and `hsl()` are unreliable in favicon rendering contexts. XML comments in SVG must not contain `--` (double hyphen); strict parsers reject that as invalid XML.
