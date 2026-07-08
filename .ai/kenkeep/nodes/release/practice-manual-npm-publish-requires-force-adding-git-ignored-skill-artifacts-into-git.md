---
type: practice
title: Manual npm publish requires force-adding git-ignored skill artifacts into git
description: >-
  When bypassing semantic-release, manually force-add SKILL.md and .cjs bundles
  into git before tagging, or npx skills add finds no skills.
tags:
  - release
  - npm
  - skills
  - git
kk_schema_version: 3
kk_id: >-
  practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git
kk_derived_from: []
kk_relates_to: []
kk_depends_on:
  - >-
    practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime
kk_confidence: high
---
The `npx skills add` installer resolves from the **GitHub git tree**, not the npm tarball. On `main`, `SKILL.md` files and `.cjs` bundles are git-ignored. They only land in git because `@semantic-release/git` force-adds them into the release commit.

If you manually publish to npm without going through semantic-release, you must also:
```bash
npm run build
git add --force templates/harness/skills/*/SKILL.md templates/harness/skills/*/scripts/*.cjs
git commit -m "build: ship assembled skills for manual release"
```
Then create the matching tag and push.

<!-- kk:related:start -->
# Related

- Depends on: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
<!-- kk:related:end -->
