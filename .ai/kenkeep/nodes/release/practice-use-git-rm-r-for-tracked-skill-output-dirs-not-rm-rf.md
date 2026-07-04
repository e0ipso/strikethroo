---
type: practice
title: 'Use git rm -r for tracked skill output dirs, not rm -rf'
description: >-
  Release commits force-add skill bundles and SKILL.md files, making them
  tracked at HEAD. Removing them requires git rm -r, not rm -rf.
tags:
  - git
  - tracked-files
  - build-artifacts
  - skills
kk_schema_version: 3
kk_id: practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The `templates/harness/skills/*/` directories contain `.gitignore`-excluded content (`scripts/` and `SKILL.md`), but release commits force-add those files via `@semantic-release/git`. As a result they are tracked at HEAD. When renaming or deleting skill directories as part of a rebrand or restructure, use `git rm -r` rather than `rm -rf` to correctly stage the removal of tracked files.
