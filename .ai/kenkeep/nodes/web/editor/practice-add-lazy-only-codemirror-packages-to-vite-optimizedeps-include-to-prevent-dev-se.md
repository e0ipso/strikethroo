---
schema_version: 2
id: >-
  practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se
title: >-
  Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent
  dev-server MIME errors
kind: practice
tags:
  - vite
  - codemirror
  - dev-server
  - lazy-loading
  - optimization
derived_from: []
relates_to: []
confidence: high
summary: >-
  CodeMirror packages reached only through React.lazy are not pre-bundled by
  Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first
  navigation to the editor.
---
Vite's dependency pre-bundler crawls the eager import graph at dev-server startup. Packages reached *only* through a `React.lazy(() => import(…))` boundary are invisible to that scan. On first navigation to the editor route, Vite attempts on-the-fly optimization; the requests return before optimization completes, the browser receives an empty `Content-Type`, and blocks the module load with a "disallowed MIME type ('')" error.

Add these packages to `optimizeDeps.include` in `vite.config.mts`:
- `@uiw/react-codemirror`
- `@codemirror/lang-markdown`
- `@codemirror/language-data`
- `@codemirror/theme-one-dark`

This is a dev-server-only setting; `vite build` ignores it. After adding it, clear `.vite` cache (`rm -rf node_modules/.vite`) and restart the dev server.
