---
type: practice
title: Never hand-commit generated skill artifacts in either tree
description: >-
  templates/harness/skills is gitignored build output; the root skills/ mirror
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
Two generated skill trees exist, with different Git states and one shared rule — never hand-edit or hand-commit either:

- `templates/harness/skills/*/SKILL.md` and `templates/harness/skills/*/scripts/*.cjs` are gitignored, untracked build output. `npm run build` overwrites them wholesale, so an edit made there is lost at the next build, and a fresh build leaves `git status` clean.
- The root `skills/*/SKILL.md` and `skills/*/scripts/*.cjs` mirror is tracked — it is what `npx skills add e0ipso/strikethroo` reads from the git tree — but it records the last released build. `scripts/sync-skills-mirror.cjs` is its only writer, the release workflow (running with `HUSKY=0`) is the only normal caller, and a hand edit disappears at the next release sync.

The source of truth is `src/skill-prompts/` for prompts and `src/skill-scripts/` for bundles — change those. The guards:

- `.husky/pre-commit` rejects staged additions or modifications of the four path patterns in one block (`--diff-filter=d`, so staged deletions — untracking migrations — pass) and names the source directories to edit instead.
- `.gitattributes` marks both trees `linguist-generated=true`, and the vendored `templates/strikethroo/config/schemas/*.xsd` `linguist-vendored=true`. GitHub collapses generated files in pull requests, so a reviewer sees source rather than churn.

The code review gate reads those same markers through `git check-attr` and drops the matching paths from the reviewed diff. This is not cosmetic. A finding against build output is unactionable by construction: the mandatory full `POST_EXECUTION` re-run regenerates the file, so any fix aimed at generated content erases itself before anyone could act on it — the fix belongs in the authored source instead. Reading the markers rather than a hard-coded path list matters because the gate runs inside the user's project and cannot know what that project generates.

A local rebuild dirties nothing tracked: the templates tree is ignored and the build never writes to `skills/`. The mirror lagging a fresh build (`node scripts/sync-skills-mirror.cjs --verify` failing locally between releases) is the designed steady state, resolved by the next release's sync — never by a hand-run sync commit.

<!-- kk:related:start -->
# Related

- Related: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
- Related: [map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content](/skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md)
<!-- kk:related:end -->
