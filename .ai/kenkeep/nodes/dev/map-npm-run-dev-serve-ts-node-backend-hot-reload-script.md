---
type: map
title: 'npm run dev:serve — ts-node backend hot-reload script'
description: >-
  Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes;
  no dist/ involvement.
tags:
  - web
  - serve
  - scripts
  - dev
kk_schema_version: 3
kk_id: map-npm-run-dev-serve-ts-node-backend-hot-reload-script
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
`npm run dev:serve` is the backend half of the hot-reload dev loop. It invokes `node --watch` with `ts-node --transpile-only` to run `src/cli.ts serve --no-open` directly from TypeScript source, restarting on any change to `src/**/*.ts`.

`npm run dev:web` is the frontend half: `vite`, serving HMR at **http://localhost:5173** with `/api/*` proxied to `http://localhost:4317` (configured in `vite.config.mts` under `server.proxy`, dev-only).
