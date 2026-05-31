---
schema_version: 1
id: practice-svg-favicon-must-use-hex-color-values-not-oklch-or-hsl
title: 'SVG favicon must use hex color values, not oklch or hsl'
kind: practice
tags:
  - web
  - favicon
  - svg
derived_from: []
relates_to: []
confidence: high
summary: >-
  Favicon SVG must use hex color values; oklch() and hsl() are unreliable in
  favicon rendering contexts.
---
When authoring the `favicon.svg`, convert all design token colors (e.g. `oklch(0.18 0.02 55)`, `hsl(335 55% 48%)`) to their hex equivalents. Favicon rendering environments cannot be assumed to support modern CSS color functions.

Additionally, XML comments in SVG must not contain `--` (double hyphen) — this is invalid XML and causes strict parsers to reject the file.
