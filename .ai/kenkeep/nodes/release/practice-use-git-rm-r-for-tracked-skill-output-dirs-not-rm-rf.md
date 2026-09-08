---
type: practice
title: 'Use git rm -r for tracked skill output dirs, not rm -rf'
description: >-
  The root skills/ mirror is tracked generated output. Removing tracked
  generated files requires staging the deletion (git rm -r), not rm -rf;
  for the mirror, the release rebuild's --clean wipe handles this.
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
The generated `dist-test/` tree is gitignored and untracked, so plain filesystem removal is fine there. The tracked generated tree is the root `skills/` release mirror. When a tracked generated file has to leave Git, the deletion must be staged — `git rm -r` (or a plain `rm` followed by staging the deletion), never a bare `rm -rf` that leaves the index untouched.

For the mirror this is normally not a manual concern: `build:skills --out skills --clean` wipes the tree before the release rebuild, and `@semantic-release/git` stages those deletions (`git ls-files -m -o` lists unstaged deletions and `git add --force` records them). Hand-staged mirror changes are rejected by the pre-commit guard; deletions are the one staged change it deliberately lets through (`--diff-filter=d`), which is how an untracking migration commits.
