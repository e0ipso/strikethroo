---
schema_version: 1
id: practice-commit-build-output-only-when-a-git-ref-consumer-reads-it
title: Commit a build output only when a git-ref consumer reads it
kind: practice
tags:
  - distribution
  - npm
  - semantic-release
  - skills
  - build-artifacts
  - gitignore
derived_from: []
relates_to: []
confidence: high
summary: >-
  Skill bundles must be committed (vercel reads the git tag); dist-web/ need not
  be (npm packs the CI-built tree, like dist/).
---
A build artifact only needs to be committed to the repo when a consumer reads it directly from a git ref. It does **not** need committing merely because it is shipped — npm packing is independent of git tracking.

The skill bundles (`templates/harness/skills/*/scripts/*.cjs` and assembled `SKILL.md`) **must** be committed because `vercel-labs/skills` (`npx skills add e0ipso/strikethroo@<tag>`) clones the repo at the tagged ref and reads `.claude-plugin/plugin.json` from it — npm is never involved in that channel. That is why `@semantic-release/git` force-adds them into the release commit despite `.gitignore` ignoring them.

The web SPA `dist-web/` is the odd one out: it is force-committed via the same `@semantic-release/git` `assets` glob, but nothing reads it from a git ref. It is distributed only inside the npm tarball (`files: ["dist/","dist-web/","templates/","LICENSE"]`), and `serve` hosts it from the installed package. The release workflow runs `npm ci → npm run build → npm test → npx semantic-release`, so `@semantic-release/npm` packs a freshly built working tree regardless of what is committed.

The proof already lives in the repo: `dist/` (the entire compiled CLI) is in `.gitignore`, is in npm `files`, but is **not** in the `@semantic-release/git` assets — so it is published to npm yet never committed. `dist-web/` could follow the same pattern: drop `dist-web/**` from the git assets, keep it in `files`. Caveat — the 71 `dist-web/` files are already tracked from past force-adds, so a one-time `git rm --cached -r dist-web/` is needed since `.gitignore` does not untrack already-tracked files.
