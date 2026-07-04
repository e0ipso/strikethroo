---
type: practice
title: Project commit hook rejects AI co-authorship attribution trailers
description: >-
  A commit hook rejects Co-Authored-By AI attribution lines; omit them when
  committing in this repository.
tags:
  - git
  - commit
  - hooks
  - attribution
kk_schema_version: 3
kk_id: practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The project's commit hook rejected a commit message that contained an AI co-authorship `Co-Authored-By:` trailer. The staging was reset and the commit did not land.

When creating commits in this repository, do not include AI attribution trailers. Commit messages must be plain conventional-commit format without co-author lines.
