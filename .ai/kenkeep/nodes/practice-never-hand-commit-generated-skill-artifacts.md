---
type: practice
title: Never hand-commit generated skill artifacts; they cannot be gitignored
description: >-
  SKILL.md and .cjs bundles are build output force-added by CI, so
  .gitattributes and a pre-commit guard cover them and the review gate skips
  them.
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
`templates/harness/skills/*/SKILL.md` and `templates/harness/skills/*/scripts/*.cjs` are build output. `npm run build` overwrites both wholesale, so an edit made to either is lost at the next build. The source of truth is `src/skill-prompts/` for prompts and `src/skill-scripts/` for bundles — change those.

They cannot be gitignored, which is the part that surprises people. `@semantic-release/git` force-adds both into the release commit because `npx skills add e0ipso/strikethroo@<tag>` reads `templates/` straight from the tagged ref, so CI must be able to commit them. Being tracked-but-generated, they need guarding rather than ignoring:

- `.husky/pre-commit` rejects either artifact when staged, and names the source directory to edit instead.
- `.gitattributes` marks them `linguist-generated=true`, and the vendored `templates/strikethroo/config/schemas/*.xsd` `linguist-vendored=true`. GitHub collapses both in pull requests, so a reviewer sees source rather than churn.

The code review gate reads those same markers through `git check-attr` and drops the matching paths from the reviewed diff. This is not cosmetic. A finding against build output is unfixable by construction: the suggestion is applied as a verbatim text replacement, the mandatory full `POST_EXECUTION` re-run regenerates the file, the fix disappears, and the next round raises the identical finding because the source was never touched — a fix/erase/re-find loop that spends the whole round budget and halts. Reading the markers rather than a hard-coded path list matters because the gate runs inside the user's project and cannot know what that project generates.

A local rebuild therefore leaves a permanently dirty working tree for these paths. That is the intended steady state; leave them dirty. The guard originally covered only the `.cjs` bundles while `SKILL.md` went on being hand-committed in ordinary feature commits, and that asymmetry was the bug — both are the same kind of artifact and are now treated the same way.

<!-- kk:related:start -->
# Related

- Related: [practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime](/release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md)
- Related: [map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content](/skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md)
<!-- kk:related:end -->
