---
schema_version: 1
id: map-eslint-config-eslint-config-mjs-flat-config-eslint-9
title: 'ESLint config: eslint.config.mjs (flat config, ESLint 9)'
kind: map
tags:
  - eslint
  - tooling
  - config
derived_from: []
relates_to: []
confidence: high
summary: >-
  The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A
  legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
---
The project uses ESLint 9 flat config at `eslint.config.mjs`. A legacy `.eslintrc.js` also exists at the repo root but is ignored by ESLint 9 when a flat config file is present — it is dead cruft.

The flat config defines separate blocks for source files, test files, and the SPA web layer, with a shared `browserGlobals` object used by both the test block and the web block.
