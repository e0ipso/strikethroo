---
type: practice
title: Review gate artifacts are git-ignored by a workspace-root .gitignore
description: >-
  init ships .ai/strikethroo/.gitignore covering plans/*/review/ and
  archive/*/review/, keeping reviewer output out of git and its own diff.
tags:
  - code-review
  - gitignore
  - workspace
  - init
  - generated-artifacts
kk_schema_version: 3
kk_id: practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore
kk_derived_from: []
kk_relates_to:
  - practice-never-hand-commit-generated-skill-artifacts
  - >-
    practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
kk_depends_on: []
kk_confidence: high
---
`init` copies `templates/strikethroo/.gitignore` to `.ai/strikethroo/.gitignore`. It ignores `plans/*/review/` and `archive/*/review/` — both paths, because archiving moves a completed plan directory wholesale from `plans/` into `archive/`, carrying its `review/` directory along.

The gate writes `base-commit.json` plus one `round-<n>/` directory per round (`review.xml` and `findings.json`) into the plan it is reviewing. All of it is machine-generated output scoped to a single execution, and the recorded base commit is live only from capture through the final round, so none of it needs to survive a clone.

Ignoring it also stops the gate reviewing itself. The reviewed diff runs from the recorded base against the working tree, so a committed round-1 `review.xml` would appear in round 2's diff as ordinary changed content — the reviewer critiquing its own findings document. Untracked files never enter that diff, which closes the loop by construction rather than by filtering.

The split is deliberate: plans, tasks and config stay trackable for projects that commit their `.ai/strikethroo/` workspace, and only the reviewer's output is excluded. It mirrors the older `templates/strikethroo/runtime/.gitignore` self-ignoring pattern for machine-generated workspace content. One caveat — the file is not hash-tracked in `.init-metadata.json`, because `updateMetadata` walks only `config/`, so a user's edit to it is overwritten on the next `init`. Regression coverage is in `src/__tests__/cli.integration.test.ts` under "init — review-artifact gitignore".

<!-- kk:related:start -->
# Related

- Related: [practice-never-hand-commit-generated-skill-artifacts](/practice-never-hand-commit-generated-skill-artifacts.md)
- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
