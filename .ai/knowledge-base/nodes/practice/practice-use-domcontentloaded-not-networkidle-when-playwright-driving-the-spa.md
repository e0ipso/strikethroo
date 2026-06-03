---
schema_version: 1
id: practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa
title: Use domcontentloaded not networkidle when Playwright-driving the SPA
kind: practice
tags:
  - capture
  - playwright
  - sse
  - testing
derived_from: []
relates_to: []
confidence: high
summary: >-
  The SPA holds an open SSE connection (/api/events) so networkidle never fires.
  Use domcontentloaded plus explicit waitForSelector calls instead.
---
When driving the SPA with Playwright (for captures or e2e tests), `waitUntil: 'networkidle'` never resolves because the SPA maintains a persistent SSE connection to `/api/events` for live updates.

Use `waitUntil: 'domcontentloaded'` combined with explicit `waitForSelector` or `waitForResponse` calls targeting rendered elements instead.
