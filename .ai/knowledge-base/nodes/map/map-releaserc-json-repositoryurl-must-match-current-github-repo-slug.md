---
schema_version: 1
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
  The repositoryUrl used by @semantic-release/github lives in .releaserc.json.
  Must be updated after a repo rename.
---
`.releaserc.json` contains the `repositoryUrl` field consumed by `@semantic-release/github`. After the repo rename from `ai-task-manager` to `strikethroo`, this field was updated to `https://github.com/e0ipso/strikethroo.git`. A stale value causes the release job to fail with a GraphQL variable error.
