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
The full hot-reload dev loop uses three processes:

1. `npm run dev` — `tsc --watch` for type-checking (optional for the run loop).
2. `npm run dev:serve` — runs the backend directly from `src/cli.ts` via `ts-node --transpile-only`, restarted by `node --watch` on any `src/**/*.ts` change. No `dist/` involved.
3. `npm run dev:web` — Vite HMR; open **http://localhost:5173**. Vite proxies `/api/*` → `http://localhost:4317`.

`dist/` is a build artifact and must not appear in the dev loop. Running the backend from compiled output means edits are silently ignored until a manual rebuild.
