---
schema_version: 1
id: >-
  practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure
title: >-
  Manual npm publish must be paired with a matching git tag to prevent
  semantic-release failure
kind: practice
tags:
  - release
  - npm
  - semantic-release
derived_from: []
relates_to: []
confidence: high
summary: >-
  Without a matching vX.Y.Z tag, semantic-release on the next push tries the
  same version again and gets a 403 from npm.
---
semantic-release computes the next version from the most recent tag. If you manually publish e.g. `3.0.0` but never create tag `v3.0.0`, the next CI push triggers semantic-release which again computes `3.0.0` from the previous tag + the `feat!:` commit, tries `npm publish`, and receives a 403 'cannot publish over existing version' error, failing the job.

Always create and push the matching tag immediately after a manual publish.
