---
type: practice
title: 'SPA source changes require npm run build:web before serve reflects them'
description: >-
  serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible
  until npm run build:web is run; a hard-refresh clears cached content-hashed
  chunks.
tags:
  - spa
  - build
  - serve
  - dev-workflow
kk_schema_version: 3
kk_id: >-
  practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them
kk_derived_from: []
kk_relates_to:
  - practice-hot-reload-dev-loop-requires-three-concurrent-processes
kk_depends_on: []
kk_confidence: high
---
The `serve` command hosts the prebuilt static `dist-web/` bundle. Any change to `src/web/` source is not reflected in the served app until `npm run build:web` (or `npm run build`) is run.

CodeMirror and other code-split chunks are content-hashed. After rebuilding, a normal browser refresh may serve old cached JS. A hard-refresh (Cmd/Ctrl+Shift+R) is required to clear the browser cache and load the new chunks.

For active frontend development, use `npm run dev:web` (Vite HMR at localhost:5173 proxying `/api/*` to the backend) instead of `serve`.

<!-- kk:related:start -->
# Related

- Related: [practice-hot-reload-dev-loop-requires-three-concurrent-processes](/dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md)
<!-- kk:related:end -->
