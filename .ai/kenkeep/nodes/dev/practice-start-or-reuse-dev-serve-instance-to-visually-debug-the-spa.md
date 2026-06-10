---
schema_version: 2
id: practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa
title: 'Start or reuse a dev:serve instance to visually debug the SPA'
kind: practice
tags:
  - web
  - serve
  - dev
  - debugging
derived_from: []
relates_to:
  - map-npm-run-dev-serve-ts-node-backend-hot-reload-script
  - practice-hot-reload-dev-loop-requires-three-concurrent-processes
confidence: high
summary: >-
  To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web
  for source changes, or use dev:web HMR at :5173.
---
When you need to visually inspect or screenshot the served SPA for debugging, first check whether a `dev:serve` instance is already running before starting another — it binds the default port **4317**, so a second copy fails with `EADDRINUSE`. In an isolated/sandboxed runtime you cannot reach the user's host instance (host `localhost:4317` and the docker-gateway hostnames are unreachable), so start your own with `npm run dev:serve` and drive it locally — e.g. Playwright/`curl` against `http://localhost:4317`.

`dev:serve` hosts the prebuilt `dist-web/` assets, not a live source build, so to see uncommitted SPA source changes at :4317 you must run `npm run build:web` first. The alternative is `npm run dev:web` (vite HMR at **:5173**, proxying `/api` to :4317), which reflects source edits live without a rebuild. Note the CLI `serve` resolver requires an initialized workspace (`.init-metadata.json`); when pointing at a bare fixture, call `startServer({ root })` directly as the e2e suites do.
