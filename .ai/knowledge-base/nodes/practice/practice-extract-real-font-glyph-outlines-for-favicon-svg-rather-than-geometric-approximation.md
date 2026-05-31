---
schema_version: 1
id: >-
  practice-extract-real-font-glyph-outlines-for-favicon-svg-rather-than-geometric-approximation
title: >-
  Extract real font glyph outlines for favicon SVG rather than geometric
  approximation
kind: practice
tags:
  - web
  - favicon
  - font
  - svg
derived_from: []
relates_to: []
confidence: high
summary: >-
  For favicons, extract actual glyph paths from the vendored font file using
  fontkit; do not approximate with geometry.
---
Web fonts do not load in favicon contexts, so `<text>` elements with font-family references fall back to system fonts and look wrong. The correct approach is to extract the actual glyph outline path from the vendored font file (e.g. `Outfit-VariableFont_wght.ttf`) using `fontkit`, then embed it as a `<path>` in the SVG.

`fontkit` can be installed transiently in `/tmp` without modifying `package.json`. When extracting, select the correct weight (regular 400) and transform the glyph from the font's UPM coordinate system (y-up) to the SVG viewBox (y-down, scaled).
