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
`init` copies `templates/strikethroo/gitignore` to `.ai/strikethroo/.gitignore`, renaming it on the way. It ignores `plans/*/review/` and `archive/*/review/` — both paths, because archiving moves a completed plan directory wholesale from `plans/` into `archive/`, carrying its `review/` directory along — plus `runtime/`, the dispatch-availability cache.

The rename is not cosmetic. A template shipped under the literal name `.gitignore` never reaches an npm consumer: npm-packlist reads it as ignore rules and drops it from the tarball, and one that does survive packing is extracted as `.npmignore`. Both failures are invisible from a git checkout, where the same template copies fine — which is how the workspace shipped without an ignore file for as long as it did. No file under `templates/` may be named `.gitignore`; `src/__tests__/cli.integration.test.ts` asserts that directly.

The gate writes `base-commit.json` plus one `round-<n>/` directory per round (`review.xml` and `findings.json`) into the plan it is reviewing. All of it is machine-generated output scoped to a single execution, and the recorded base commit is live only from capture through the final round, so none of it needs to survive a clone.

Ignoring it also stops the gate reviewing itself. The reviewed diff runs from the recorded base against the working tree, so a committed round-1 `review.xml` would appear in round 2's diff as ordinary changed content — the reviewer critiquing its own findings document. The gitignore is what closes that loop. Untracked files *are* in the reviewed scope — the gate synthesizes an add-diff for each one — but it enumerates them with `git ls-files --others --exclude-standard`, which applies the project's ignore rules. So the same `.gitignore` entry keeps `review/` out whether the artifacts are committed or not, and the protection does not depend on nothing having committed them.

The split is deliberate: plans, tasks and config stay trackable for projects that commit their `.ai/strikethroo/` workspace, and only machine-generated output is excluded. `runtime/` is covered from here rather than by a self-ignoring file inside it, both because that nested file hit the same npm mangling and because the directory is created on demand by the first dispatch probe — long after `init` could have placed anything in it. One caveat — the file is not hash-tracked in `.init-metadata.json`, because `updateMetadata` walks only `config/`, so a user's edit to it is overwritten on the next `init`. That refresh is what lets a newly added entry reach workspaces initialized before it existed. Regression coverage is in `src/__tests__/cli.integration.test.ts` under "init — workspace gitignore".

<!-- kk:related:start -->
# Related

- Related: [practice-never-hand-commit-generated-skill-artifacts](/practice-never-hand-commit-generated-skill-artifacts.md)
- Related: [practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore](/git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md)
<!-- kk:related:end -->
