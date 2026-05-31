---
schema_version: 1
id: >-
  practice-when-renaming-an-npm-package-bump-to-next-semver-major-rather-than-deleting-old-git-tags
title: >-
  When renaming an npm package, bump to next semver major rather than deleting
  old git tags
kind: practice
tags:
  - npm
  - release
  - semantic-release
  - versioning
derived_from: []
relates_to: []
confidence: high
summary: >-
  Deleting git tags to start a renamed package at 1.0.0 destroys GitHub
  Releases. Prefer bumping to next major via feat!: convention.
---
When a package is renamed (e.g. `@e0ipso/ai-task-manager` → `strikethroo`), the temptation is to delete all old version tags and start at `1.0.0`. However each git tag corresponds to a GitHub Release with release notes. Deleting tags orphans or destroys those releases irreversibly.

The preferred approach is to keep all existing tags, bump `package.json` to the next semver major that `semantic-release` would compute from the `feat!:` rebrand commit (e.g. `3.0.0`), publish manually, and create a matching `v3.0.0` git tag so semantic-release continues coherently from that baseline.
