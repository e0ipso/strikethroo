---
schema_version: 1
id: practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf
title: 'Use git rm -r for tracked skill output dirs, not rm -rf'
kind: practice
tags:
  - git
  - tracked-files
  - build-artifacts
  - skills
derived_from: []
relates_to: []
confidence: high
summary: >-
  Release commits force-add skill bundles and SKILL.md files, making them
  tracked at HEAD. Removing them requires git rm -r, not rm -rf.
---
The `templates/harness/skills/*/` directories contain `.gitignore`-excluded content (`scripts/` and `SKILL.md`), but release commits force-add those files via `@semantic-release/git`. As a result they are tracked at HEAD. When renaming or deleting skill directories as part of a rebrand or restructure, use `git rm -r` rather than `rm -rf` to correctly stage the removal of tracked files.
