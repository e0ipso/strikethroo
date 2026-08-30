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
`init` copies `templates/strikethroo/gitignore` to `.ai/strikethroo/.gitignore`, renaming it on the way. It ignores `plans/*/review/` and `archive/*/review/`, because archiving moves a plan and its review directory together. It also ignores `runtime/`, the dispatch-availability cache, and the machine-local `config/config.yaml`.

The rename is not cosmetic. A template shipped under the literal name `.gitignore` never reaches an npm consumer: npm-packlist reads it as ignore rules and drops it from the tarball, and one that does survive packing is extracted as `.npmignore`. Both failures are invisible from a git checkout, where the same template copies fine — which is how the workspace shipped without an ignore file for as long as it did. No file under `templates/` may be named `.gitignore`; `src/__tests__/cli.integration.test.ts` asserts that directly.

The gate writes `base-commit.json`, `review.xml`, and `findings.json` directly into `<plan-dir>/review/`. An uncertified review may also leave `reviewer-output.txt`. The directory is flat because the gate runs once per plan. All of it is machine-generated output scoped to one execution, so none of it needs to survive a clone.

Ignoring the directory also stops the gate reviewing its own untracked output. The reviewed scope includes untracked files by synthesizing an add-diff for each path returned by `git ls-files --others --exclude-standard`. That command applies the workspace ignore rules, so `review/` never enters the synthesized scope. Git ignore rules do not suppress a file that is already tracked; a project that once committed review artifacts must remove them from the index for this protection to apply.

Plans, tasks, hooks, templates, and schemas stay trackable for projects that commit their `.ai/strikethroo/` workspace. Only host-local configuration and generated output are excluded. `runtime/` is covered at the workspace root because the first dispatch probe creates it on demand. The workspace `.gitignore` is not hash-tracked in `.init-metadata.json`, because `updateMetadata` walks only `config/`, so a later `init` refreshes it from the shipped template. Regression coverage is in `src/__tests__/cli.integration.test.ts` under `init — workspace gitignore`.

<!-- kk:related:start -->
# Related

- Related: [practice-never-hand-commit-generated-skill-artifacts](/practice-never-hand-commit-generated-skill-artifacts.md)
- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
