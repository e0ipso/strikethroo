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
The `npx skills add` installer resolves from the **GitHub git tree**, not the npm tarball. The tracked root `skills/` directory is rebuilt only by `@semantic-release/exec` during a release; local builds write the gitignored `dist-test/`.

If you manually publish to npm without going through semantic-release, you must also:
```bash
npm run build
npm run build:release-skills
git add skills
HUSKY=0 git commit -m "chore(release): <version>"
```
Then create the matching `v<version>` tag and push. Without the tag, CI's check that `skills/` equals the last release tag fails on the next push.

<!-- kk:related:start -->
# Related

- Depends on: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
<!-- kk:related:end -->
