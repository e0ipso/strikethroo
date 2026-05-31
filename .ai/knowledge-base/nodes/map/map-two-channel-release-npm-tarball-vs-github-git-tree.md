---
schema_version: 1
id: map-two-channel-release-npm-tarball-vs-github-git-tree
title: 'Two-channel release: npm tarball vs GitHub git tree'
kind: map
tags:
  - release
  - distribution
  - npm
  - skills
derived_from: []
relates_to: []
confidence: high
summary: >-
  `npm publish` populates the tarball; `npx skills add` resolves from the GitHub
  git tree. Both must be populated on every release.
---
There are two distinct delivery channels that must both be updated on each release:

1. **npm tarball** — populated by `npm publish` (or semantic-release). Contains `dist/` and `templates/` per `files` in `package.json`.
2. **GitHub git tree** — what `npx skills add e0ipso/strikethroo` clones. Requires `SKILL.md` and `.cjs` bundles to be present as committed files (force-added by `@semantic-release/git`).

Verify both with:
```bash
git ls-tree -r v<tag> -- 'templates/harness/skills/*/scripts/*.cjs'
npm view strikethroo versions
```
