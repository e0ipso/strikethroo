---
type: practice
title: Strikethroo takes no stance on committing the .ai/strikethroo/ workspace
description: >-
  Whether a consuming project commits .ai/strikethroo/ is that project's call;
  this repo's root .gitignore entry is dogfooding, not product behavior.
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
Strikethroo is neutral on whether a project that uses it commits its `.ai/strikethroo/` workspace. Plans, tasks, and config are ordinary project files; some teams track them for review history and some do not. Never write documentation, skill prompts, or node bodies that assert the workspace is untracked, that plans or review findings "do not survive a fresh clone", or anything else that presumes a tracking policy the product does not set.

The confusion has one source: this repository's own root `.gitignore` carries `/.ai/strikethroo` because the repo dogfoods Strikethroo and its local workspace is throwaway state. That line describes *this* repo's habit and nothing about a consuming project. Reading it as product behavior is the mistake — it produced the false claim at `docs/customization.md:101` that review findings vanish on clone "because `.ai/strikethroo/` is gitignored", in user-facing docs, where it would have propagated to every reader.

The single thing Strikethroo does ignore on a user's behalf is review-gate output. `init` copies `templates/strikethroo/.gitignore` into the workspace, and it lists exactly `plans/*/review/` and `archive/*/review/`. That narrow scope is deliberate — it keeps the gate from reviewing its own findings while leaving everything else trackable — and it is the only correct basis for saying a review artifact will not be in a fresh clone.

<!-- kk:related:start -->
# Related

- Related: [practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore](/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md)
- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
