---
type: practice
title: Hot-reload dev loop requires three concurrent processes
description: >-
  Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with
  /api/* proxied to localhost:4317. No dist/ involvement.
tags:
  - dev
  - tooling
  - web
  - serve
kk_schema_version: 3
kk_id: practice-hot-reload-dev-loop-requires-three-concurrent-processes
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The full hot-reload setup uses three processes, although only the backend and frontend are required to run the app:

1. `npm run dev` — `tsc --watch` for type-checking (optional for the run loop).
2. `npm run dev:serve` — executes `src/cli.ts` with `serve --no-open` through `ts-node/register/transpile-only`, restarted by `node --watch` on source changes. Commander still registers `init`, `export profile`, `serve`, and `validate`, but the explicit `serve` argument starts only the backend.
3. `npm run dev:web` — Vite HMR; open **http://localhost:5173**. Vite proxies `/api/*` → `http://localhost:4317`.

`dist/` is not part of this loop. Running `node dist/cli.js serve` instead uses the last build and will not reflect backend source edits until `npm run build` runs again.
