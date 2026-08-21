---
type: practice
title: Workspace tracking is project-owned except local configuration and runtime output
description: >-
  Projects choose whether to track plans and authored workspace files, while
  init ignores machine-local config.yaml, review artifacts, and runtime output.
tags:
  - gitignore
  - workspace
  - documentation
  - code-review
  - init
kk_schema_version: 3
kk_id: practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace
kk_derived_from: []
kk_relates_to:
  - practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore
  - >-
    practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
kk_depends_on: []
kk_confidence: high
---
Strikethroo is neutral on whether a project commits its authored `.ai/strikethroo/` workspace. Plans, tasks, hooks, templates, shared disciplines, and project context may be tracked or left local. Never claim that the whole workspace is untracked or that plan history cannot survive a fresh clone.

There are three product-owned exceptions in the workspace `.gitignore`: `config/config.yaml`, plan review directories, and `runtime/`. `init` creates and hash-tracks `config/config.yaml`, but ignores it because harness permissions, installed models, and execution-routing choices depend on the developer and machine. Review artifacts and the availability cache are generated runtime state. Ignoring these paths also keeps review output out of its own diff.

Ignore rules are defaults, not a security boundary. They do not remove a file that Git already tracks. A project adopting the local-config policy later must choose to run `git rm --cached .ai/strikethroo/config/config.yaml` and commit that deletion. Strikethroo never runs the command automatically.

This repository's root `.gitignore` also contains `/.ai/strikethroo` because it treats its dogfood workspace as local state. That line is repository policy, not product behavior for consuming projects.

Teams that want to share a starting configuration use a strikethroo setup profile. Profile export includes the current `config/config.yaml` verbatim despite its workspace ignore rule, and profile import seeds it during `init`. Each recipient then owns the imported file locally. This explicit exchange is separate from tracking live machine settings in every project clone.

<!-- kk:related:start -->
# Related

- Related: [practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore](/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md)
- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
