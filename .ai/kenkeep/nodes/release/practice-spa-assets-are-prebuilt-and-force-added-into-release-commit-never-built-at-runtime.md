---
type: practice
title: 'Two-channel release: npm tarball vs GitHub git tree'
description: >-
  npm publish ships dist/ and dist-web/; npx skills add reads force-added
  SKILL.md and .cjs bundles from the GitHub git tree. Normal source commits
  leave generated skill-artifact force-adding to release automation.
tags:
  - release
  - distribution
  - npm
  - skills
  - web
  - spa
  - build
  - serve
  - semantic-release
kk_schema_version: 3
kk_id: >-
  practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime
kk_derived_from:
  - '7f15ae61-53e1-4644-8689-567a37c4ff39:practice:0'
kk_relates_to: []
kk_depends_on:
  - practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf
kk_confidence: high
---
There are two distinct delivery channels that must both be updated on each release:

1. **npm tarball** — populated by `npm publish` (or semantic-release). Contains `dist/` and `dist-web/` per `files` in `package.json`.
2. **GitHub git tree** — what `npx skills add e0ipso/strikethroo` clones. Requires `SKILL.md` and `.cjs` bundles to be present as committed files (force-added by `@semantic-release/git`).

Verify both with:
```bash
git ls-tree -r v<tag> -- 'templates/harness/skills/*/scripts/*.cjs'
npm view strikethroo versions
```

The `npx strikethroo serve` SPA (`dist-web/`) is built with Vite at publish time, not on the user's machine — Vite, React, and Tailwind v4 stay `devDependencies`, and the runtime `serve` is a lightweight Node built-in static-file + JSON-API server (no Vite/React at runtime). It reaches users **only** through the npm tarball: `files: ["dist-web/"]` in `package.json` plus the `prepublishOnly: npm run build` step (and the CI build before publish). `@semantic-release/npm` packs the freshly built working tree, so npm delivery does not depend on `dist-web/` being tracked in git.

`dist-web/` is git-ignored and must **not** appear in the `@semantic-release/git` `assets` glob in `.releaserc.json`. That plugin stages every asset glob with `git add --force`, bypassing `.gitignore`, and commits the matches to `main` in the `chore(release): <version>` commit — so listing `dist-web/**` there leaks the entire built SPA (~193 files) back into the repo on every release (the symptom: a recurring manual `git rm` of `dist-web/` after pulling `main`). Keep that glob limited to artifacts whose *only* consumer is the git tree.

Force-add belongs to the skill release channel only: `templates/harness/skills/*/scripts/*.cjs` and `templates/harness/skills/*/SKILL.md`, which `npx skills add e0ipso/strikethroo@<tag>` reads directly from the tagged git ref. During normal source commits, do not manually force-add those generated skill artifacts just because they changed locally or a new ignored bundle exists. Commit the authored inputs instead (for example `src/skill-prompts/**`, `src/skill-scripts/**`, templates, docs, and tests) and let semantic-release/CI generate and force-add the release artifacts into the release commit. The exception is a manual npm publish that bypasses semantic-release: in that path, manually force-add the skill artifacts before tagging so the GitHub git tree contains installable skills.

`dist/` (the CLI `tsc` output) is neither committed nor force-added — it is git-ignored and ships solely in the npm tarball, exactly like `dist-web/`.

Each artifact lives where its consumer reads it. The SPA's only consumer is the npm-published `serve` command, so committing it to git is pure churn (large binary diffs, repeated removals). The skill bundles are the mirror image — their consumer is the git ref that `npx skills add` clones, so they must exist at release tags even though normal source commits leave generated bundle staging to the release pipeline.

<!-- kk:citations:start -->
# Citations

[1] [7f15ae61-53e1-4644-8689-567a37c4ff39:practice:0](7f15ae61-53e1-4644-8689-567a37c4ff39:practice:0)
<!-- kk:citations:end -->

<!-- kk:related:start -->
# Related

- Depends on: [practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf](/release/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md)
<!-- kk:related:end -->
