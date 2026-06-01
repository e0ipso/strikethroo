---
schema_version: 1
id: >-
  practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages
title: Apply sticky positioning to .sb sidebar to keep footer visible on all pages
kind: practice
tags:
  - web
  - css
  - layout
  - sidebar
  - app-shell
derived_from: []
relates_to: []
confidence: high
summary: >-
  Without sticky+100vh, .sb stretches to content height in the grid; its footer
  disappears below the fold on long plans.
---
The `.app` CSS grid uses `min-height: 100vh` with no overflow containment, so the whole document scrolls and grid cells stretch to the tallest row by default. Without explicit height constraints, `.sb` (the left sidebar) stretches to the height of the longest plan, and `margin-top: auto` on `.sb__foot` parks it at the bottom of that stretched column — far below the visible viewport.

Fix (`app-shell.css`, `.sb`): `position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto;`. The sidebar pins to the viewport height, the footer stays visible on every page, and `overflow-y: auto` lets the sidebar scroll internally if its content exceeds the viewport.

This layout property is load-bearing — removing it would silently break the sidebar footer visibility on any plan longer than the viewport.
