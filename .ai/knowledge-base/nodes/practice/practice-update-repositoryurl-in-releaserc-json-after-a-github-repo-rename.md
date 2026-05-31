---
schema_version: 1
id: practice-update-repositoryurl-in-releaserc-json-after-a-github-repo-rename
title: Update repositoryUrl in .releaserc.json after a GitHub repo rename
kind: practice
tags:
  - semantic-release
  - releaserc
  - ci
derived_from: []
relates_to: []
confidence: high
summary: >-
  semantic-release uses repositoryUrl for GitHub API calls; a stale old-slug
  value causes a GraphQL variable error and breaks CI releases.
---
After renaming a GitHub repository, `.releaserc.json`'s `repositoryUrl` field must be updated to the new slug. A stale value causes `@semantic-release/github` to fail with `Variable $owner of type String! was provided invalid value`, blocking all releases.

This is the highest-priority URL fix after a repo rename.
