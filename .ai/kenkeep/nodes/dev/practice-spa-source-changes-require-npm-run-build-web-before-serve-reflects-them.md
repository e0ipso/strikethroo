---
schema_version: 2
id: >-
  practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them
title: 'SPA source changes require npm run build:web before serve reflects them'
kind: practice
tags:
  - spa
  - build
  - serve
  - dev-workflow
derived_from: []
relates_to:
  - practice-hot-reload-dev-loop-requires-three-concurrent-processes
confidence: high
summary: >-
  serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible
  until npm run build:web is run; a hard-refresh clears cached content-hashed
  chunks.
---
The `serve` command hosts the prebuilt static `dist-web/` bundle. Any change to `src/web/` source is not reflected in the served app until `npm run build:web` (or `npm run build`) is run.

CodeMirror and other code-split chunks are content-hashed. After rebuilding, a normal browser refresh may serve old cached JS. A hard-refresh (Cmd/Ctrl+Shift+R) is required to clear the browser cache and load the new chunks.

For active frontend development, use `npm run dev:web` (Vite HMR at localhost:5173 proxying `/api/*` to the backend) instead of `serve`.
