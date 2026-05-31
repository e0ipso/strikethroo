---
schema_version: 1
id: >-
  practice-first-publish-of-a-new-npm-package-name-requires-npm-token-oidc-trusted-publishing-fails
title: >-
  First publish of a new npm package name requires NPM_TOKEN; OIDC trusted
  publishing fails
kind: practice
tags:
  - npm
  - publish
  - oidc
  - ci
derived_from: []
relates_to: []
confidence: high
summary: >-
  npm OIDC trusted publishing cannot bootstrap a brand-new package name; first
  publish needs manual publish or NPM_TOKEN set in CI.
---
npm's OIDC trusted-publishing flow authenticates against an existing package record. When publishing a brand-new package name for the first time (e.g. `strikethroo`), the OIDC handshake returns 404 and CI fails.

The workaround: (a) publish once manually with a logged-in npm account (`npm publish`), after which OIDC works for subsequent CI runs; or (b) temporarily remove `id-token: write` from the CI workflow's `permissions:` block and set `NPM_TOKEN` as a repo secret. After the first publish establishes the package, configure a trusted publisher on npmjs.com and restore OIDC.
