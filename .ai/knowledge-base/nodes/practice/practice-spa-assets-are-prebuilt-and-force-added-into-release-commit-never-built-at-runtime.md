---
schema_version: 1
id: >-
  practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime
title: >-
  SPA assets are prebuilt and force-added into release commit, never built at
  runtime
kind: practice
tags:
  - web
  - spa
  - build
  - distribution
  - serve
derived_from: []
relates_to: []
confidence: high
summary: >-
  Vite/React/Tailwind stay devDependencies; serve ships pre-compiled static
  assets force-added by @semantic-release/git, mirroring skill bundle
  distribution.
---
The `npx strikethroo serve` SPA is built with Vite at publish time, not on the user's machine. This mirrors the pattern for skill `.cjs` bundles and `SKILL.md` files: git-ignored on `main`, force-added into the release commit by `@semantic-release/git`, then shipped in the npm package via the `files` array in `package.json`.

Vite, React, and Tailwind v4 are `devDependencies` only. The runtime `serve` command is a lightweight Node built-in static-file + JSON-API server — no Vite or React at runtime. First run works with plain `npx strikethroo serve`.
