---
type: practice
title: 'Two-channel release: npm tarball vs GitHub git tree'
description: >-
  npm publish ships dist/ and dist-web/; npx skills add reads the tracked root
  skills/ mirror from the GitHub git tree. The mirror is written only by the
  release workflow's sync step and staged by @semantic-release/git.
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

1. **npm tarball** — populated by `npm publish` (or semantic-release). Contains `dist/`, `dist-web/`, and `templates/` per `files` in `package.json`.
2. **GitHub git tree** — what `npx skills add e0ipso/strikethroo` reads. The installable content is the tracked root `skills/` mirror: seven `st-*` directories, each with a rendered `SKILL.md` and its `scripts/*.cjs` bundles. The release workflow's `node scripts/sync-skills-mirror.cjs` step (after tests, before `npx semantic-release`) replaces the mirror from the just-built `templates/harness/skills/` tree and fails the release on any byte difference; `@semantic-release/git` then stages `skills/**` into the tagged release commit. Stale-file deletions are staged too: the plugin's `git ls-files -m -o` listing includes unstaged deletions, and `git add --force` on a deleted path records the removal.

Verify both with:
```bash
git ls-tree -r v<tag> -- 'skills/*/SKILL.md' 'skills/*/scripts/*.cjs'
npm view strikethroo versions
```

The `npx strikethroo serve` SPA (`dist-web/`) is built with Vite at publish time, not on the user's machine — Vite, React, and Tailwind v4 stay `devDependencies`, and the runtime `serve` is a lightweight Node built-in static-file + JSON-API server (no Vite/React at runtime). It reaches users **only** through the npm tarball: `files: ["dist-web/"]` in `package.json` plus the `prepublishOnly: npm run build` step (and the CI build before publish). `@semantic-release/npm` packs the freshly built working tree, so npm delivery does not depend on `dist-web/` being tracked in git.

`dist-web/` is git-ignored and must **not** appear in the `@semantic-release/git` `assets` glob in `.releaserc.json`. That plugin stages every asset glob with `git add --force`, bypassing `.gitignore`, and commits the matches to `main` in the `chore(release): <version>` commit — so listing `dist-web/**` there leaks the entire built SPA (~193 files) back into the repo on every release (the symptom: a recurring manual `git rm` of `dist-web/` after pulling `main`). Keep that glob limited to artifacts whose *only* consumer is the git tree.

The generated `templates/harness/skills/` tree is gitignored, untracked local build output: it ships only inside the npm tarball and is never committed. During normal source commits, commit the authored inputs (`src/skill-prompts/**`, `src/skill-scripts/**`, templates, docs, tests) and leave both generated trees alone — `scripts/sync-skills-mirror.cjs` is the only writer of the root `skills/` mirror, release automation is its only normal caller, and the pre-commit guard rejects hand-staged files from either tree. A skill-source change must be committed with a releasing type (`feat`, `fix`, `perf`, `refactor`), because the mirror updates only when a release is created; a non-releasing type leaves the mirror on `main` lagging with no failing signal.

`dist/` (the CLI `tsc` output) is not committed either — it is git-ignored and ships solely in the npm tarball, exactly like `dist-web/`.

Each artifact lives where its consumer reads it. The SPA's only consumer is the npm-published `serve` command, so committing it to git is pure churn (large binary diffs, repeated removals). The skill mirror is the opposite case — its consumer is the git ref the bare installer reads, so it must exist tracked on `main` and at release tags, refreshed exclusively by the release sync.

<!-- kk:citations:start -->
# Citations

[1] [7f15ae61-53e1-4644-8689-567a37c4ff39:practice:0](7f15ae61-53e1-4644-8689-567a37c4ff39:practice:0)
<!-- kk:citations:end -->

<!-- kk:related:start -->
# Related

- Depends on: [practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf](/release/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md)
<!-- kk:related:end -->
