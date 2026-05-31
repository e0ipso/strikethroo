---
schema_version: 1
id: >-
  practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git
title: Manual npm publish requires force-adding git-ignored skill artifacts into git
kind: practice
tags:
  - release
  - npm
  - skills
  - git
derived_from: []
relates_to: []
confidence: high
summary: >-
  When bypassing semantic-release, manually force-add SKILL.md and .cjs bundles
  into git before tagging, or npx skills add finds no skills.
---
The `npx skills add` installer resolves from the **GitHub git tree**, not the npm tarball. On `main`, `SKILL.md` files and `.cjs` bundles are git-ignored. They only land in git because `@semantic-release/git` force-adds them into the release commit.

If you manually publish to npm without going through semantic-release, you must also:
```bash
npm run build
git add --force templates/harness/skills/*/SKILL.md templates/harness/skills/*/scripts/*.cjs
git commit -m "build: ship assembled skills for manual release"
```
Then create the matching tag and push.
