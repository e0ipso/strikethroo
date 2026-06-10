---
schema_version: 2
id: map-releaserc-json-repositoryurl-must-match-current-github-repo-slug
title: .releaserc.json repositoryUrl must match current GitHub repo slug
kind: map
tags:
  - releaserc
  - semantic-release
  - config
derived_from: []
relates_to: []
confidence: medium
summary: >-
  .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match
  the current GitHub repo slug or releases fail.
---
`.releaserc.json` contains the `repositoryUrl` field (`https://github.com/e0ipso/strikethroo.git`) consumed by `@semantic-release/github`. It must match the current GitHub repo slug; a stale value causes the release job to fail with a GraphQL variable error (`Variable $owner of type String! was provided invalid value`).
