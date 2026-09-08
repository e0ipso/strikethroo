---
type: practice
title: Never hand-commit generated skill artifacts in either tree
description: >-
  dist-test is gitignored build output; the root skills/ mirror
  is tracked but written only by the release sync. .gitattributes and the
  pre-commit guard cover both trees and the review gate skips them.
tags:
  - build
  - skills
  - git
  - gitattributes
  - review-gate
  - generated-artifacts
kk_schema_version: 3
kk_id: practice-never-hand-commit-generated-skill-artifacts
kk_derived_from: []
kk_relates_to:
  - >-
    practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime
  - map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content
kk_depends_on: []
kk_confidence: high
---
Two generated skill trees exist, written by the same two builders to different output directories, with one shared rule. Never hand-edit or hand-commit either:

- `dist-test/*/SKILL.md`, `dist-test/*/scripts/*.cjs`, and `dist-test/*/references/*.md` are gitignored, untracked build output. `npm run build` overwrites them, so an edit made there is lost at the next build, and a fresh build leaves `git status` clean. Tests read this tree through `src/__tests__/built-skills.ts`.
- The root `skills/*/SKILL.md`, `skills/*/scripts/*.cjs`, and `skills/*/references/*.md` mirror is tracked. It is what `npx skills add e0ipso/strikethroo` reads from the git tree, but it records the last released build. `npm run build:release-skills` (`build:skills --out skills --clean` then `build:skill-prompts --out skills`) is its only writer, `@semantic-release/exec` running with `HUSKY=0` is the only normal caller, and a hand edit disappears at the next release rebuild.

The source of truth is `src/skill-prompts/` for prompts and references, and `src/skill-scripts/` for bundles. Change those. The guards:

- `.husky/pre-commit` rejects staged additions or modifications of the three `skills/` path patterns in one block. Its `--diff-filter=d` permits staged deletions for untracking migrations, and its rejection names the source directories to edit instead.
- Both CI workflows fail when `skills/` differs from the last `v*` tag, which catches a hand edit or a local release rebuild that bypassed the hook before it can be installed.
- `.gitattributes` marks the `skills/` tree `linguist-generated=true`, and the vendored `templates/strikethroo/config/schemas/*.xsd` `linguist-vendored=true`. GitHub collapses generated files in pull requests, so a reviewer sees source rather than churn.

The code review gate reads those same markers through `git check-attr` and drops the matching paths from the reviewed diff. This is not cosmetic. A finding against build output is unactionable by construction: the mandatory full `POST_EXECUTION` re-run regenerates the file, so any fix aimed at generated content erases itself before anyone could act on it — the fix belongs in the authored source instead. Reading the markers rather than a hard-coded path list matters because the gate runs inside the user's project and cannot know what that project generates.

A local rebuild dirties nothing tracked: `dist-test/` is ignored and the build never writes to `skills/` unless asked with `--out skills`. `skills/` lagging a fresh build between releases is the designed steady state, resolved by the next release — never by a hand-run `build:release-skills` commit. Merging `main` after a release therefore brings a large generated diff under `skills/`; that is expected, not an accident.

<!-- kk:related:start -->
# Related

- Related: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
- Related: [map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content](/skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md)
<!-- kk:related:end -->
