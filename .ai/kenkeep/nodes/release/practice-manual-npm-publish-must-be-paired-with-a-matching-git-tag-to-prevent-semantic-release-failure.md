---
type: practice
title: >-
  Manual npm publish must be paired with a matching git tag to prevent
  semantic-release failure
description: >-
  Without a matching vX.Y.Z tag, semantic-release on the next push tries the
  same version again and gets a 403 from npm.
tags:
  - release
  - npm
  - semantic-release
kk_schema_version: 3
kk_id: >-
  practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure
kk_derived_from: []
kk_relates_to:
  - >-
    practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git
kk_depends_on: []
kk_confidence: high
---
semantic-release computes the next version from the most recent tag. If you manually publish e.g. `3.0.0` but never create tag `v3.0.0`, the next CI push triggers semantic-release which again computes `3.0.0` from the previous tag + the `feat!:` commit, tries `npm publish`, and receives a 403 'cannot publish over existing version' error, failing the job.

Always create and push the matching tag immediately after a manual publish.

<!-- kk:related:start -->
# Related

- Related: [practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git](/release/practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git.md)
<!-- kk:related:end -->
