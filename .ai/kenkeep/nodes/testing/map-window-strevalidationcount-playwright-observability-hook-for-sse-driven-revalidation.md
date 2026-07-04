---
type: map
title: >-
  window.__stRevalidationCount — Playwright observability hook for SSE-driven
  revalidation
description: >-
  Deliberately-shipped window counter that Playwright e2e tests read to verify
  live-data revalidation fired after an SSE change event.
tags:
  - web
  - testing
  - playwright
  - e2e
  - observability
  - sse
kk_schema_version: 3
kk_id: >-
  map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
`window.__stRevalidationCount` is a deliberately-shipped production observability hook in the SPA. It is incremented each time `RevalidationProvider` triggers a data refresh in response to an SSE `changed` event from `/api/events`.

Playwright e2e tests read this counter to verify that a disk change propagated through the live-update pipeline without relying on visual UI elements (such as the now-removed `ConnectionIndicator`). The counter survives React re-renders because it lives on `window`, not in component state.

The hook is intentional and retained for testability — it is the only observable reconnection/revalidation signal available to headless tests after `ConnectionIndicator` was removed.
