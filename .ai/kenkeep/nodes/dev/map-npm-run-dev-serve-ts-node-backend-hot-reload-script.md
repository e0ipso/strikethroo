---
schema_version: 2
id: map-npm-run-dev-serve-ts-node-backend-hot-reload-script
title: 'npm run dev:serve — ts-node backend hot-reload script'
kind: map
tags:
  - web
  - serve
  - scripts
  - dev
derived_from: []
relates_to: []
confidence: high
summary: >-
  Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes;
  no dist/ involvement.
---
`npm run dev:serve` is the backend half of the hot-reload dev loop. It invokes `node --watch` with `ts-node --transpile-only` to run `src/cli.ts serve --no-open` directly from TypeScript source, restarting on any change to `src/**/*.ts`.

`npm run dev:web` is the frontend half: `vite`, serving HMR at **http://localhost:5173** with `/api/*` proxied to `http://localhost:4317` (configured in `vite.config.mts` under `server.proxy`, dev-only).
