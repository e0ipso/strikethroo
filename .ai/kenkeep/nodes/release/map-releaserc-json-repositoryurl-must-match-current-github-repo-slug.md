---
type: map
title: .releaserc.json repositoryUrl must match current GitHub repo slug
description: >-
  .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match
  the current GitHub repo slug or releases fail.
tags:
  - releaserc
  - semantic-release
  - config
kk_schema_version: 3
kk_id: map-releaserc-json-repositoryurl-must-match-current-github-repo-slug
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: medium
---
`.releaserc.json` contains the `repositoryUrl` field (`https://github.com/e0ipso/strikethroo.git`) consumed by `@semantic-release/github`. It must match the current GitHub repo slug; a stale value causes the release job to fail with a GraphQL variable error (`Variable $owner of type String! was provided invalid value`).
