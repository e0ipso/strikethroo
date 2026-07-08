---
type: practice
title: Use domcontentloaded not networkidle when Playwright-driving the SPA
description: >-
  The SPA holds an open SSE connection (/api/events) so networkidle never fires.
  Use domcontentloaded plus explicit waitForSelector calls instead.
tags:
  - capture
  - playwright
  - sse
  - testing
kk_schema_version: 3
kk_id: practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa
kk_derived_from: []
kk_relates_to:
  - >-
    map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation
kk_depends_on: []
kk_confidence: high
---
When driving the SPA with Playwright (for captures or e2e tests), `waitUntil: 'networkidle'` never resolves because the SPA maintains a persistent SSE connection to `/api/events` for live updates.

Use `waitUntil: 'domcontentloaded'` combined with explicit `waitForSelector` or `waitForResponse` calls targeting rendered elements instead.

<!-- kk:related:start -->
# Related

- Related: [map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation](/testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md)
<!-- kk:related:end -->
