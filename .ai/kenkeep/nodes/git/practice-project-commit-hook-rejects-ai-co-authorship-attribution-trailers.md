---
schema_version: 2
id: practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers
title: Project commit hook rejects AI co-authorship attribution trailers
kind: practice
tags:
  - git
  - commit
  - hooks
  - attribution
derived_from: []
relates_to: []
confidence: high
summary: >-
  A commit hook rejects Co-Authored-By AI attribution lines; omit them when
  committing in this repository.
---
The project's commit hook rejected a commit message that contained an AI co-authorship `Co-Authored-By:` trailer. The staging was reset and the commit did not land.

When creating commits in this repository, do not include AI attribution trailers. Commit messages must be plain conventional-commit format without co-author lines.
