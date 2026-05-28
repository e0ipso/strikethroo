---
id: 4
group: "release-pipeline"
dependencies: [1]
status: "completed"
created: 2026-05-20
skills:
  - github-actions
  - bash
---
# Add `release-skills.yml` workflow to publish tagged release commits containing built bundles

## Objective
Create a GitHub Actions workflow that triggers on `v*` tag pushes, runs the full build, force-adds the otherwise git-ignored `.cjs` bundles, creates a detached release commit, and force-moves the tag to point at that commit. `main` stays bundle-free; tagged refs are self-contained so `npx skills add e0ipso/ai-task-manager@<tag>` resolves a fully buildable release.

## Skills Required
- `github-actions` — workflow YAML, permissions model, tag manipulation via `actions/checkout` + git push.
- `bash` — the workflow's shell steps for `git add -f`, detached commit creation, and force tag move.

## Acceptance Criteria
- [ ] `.github/workflows/release-skills.yml` exists and validates as GitHub Actions YAML (no `actionlint` or `gh workflow view` failures).
- [ ] Trigger: `on: push: tags: ['v*']`.
- [ ] Top-level `permissions:` block includes `contents: write` (at minimum).
- [ ] Job steps perform, in order: checkout, Node setup (matching the project's existing version policy from `release.yml`), `npm ci`, `npm run build`, `git add -f skills/*/scripts/*.cjs`, create a detached release commit (the commit message includes the tag `[release-bundle]`), force-move the tag to the release commit, push the moved tag.
- [ ] Workflow file begins with an explanatory comment block describing why the workflow exists and the "main stays clean, tag is self-contained" invariant (so future maintainers don't see anomalous `[release-bundle]` commits in history and assume they're a mistake).
- [ ] After running against a throwaway `v0.0.0-test` tag, `git ls-tree -r v0.0.0-test -- 'skills/*/scripts/*.cjs'` lists `.cjs` files (one or more per skill); the same command on `main` returns nothing.
- [ ] Re-running the workflow against the same tag does not corrupt history (idempotent: force-move replaces previous release commit cleanly).

## Technical Requirements
- `actions/checkout` must be configured to fetch enough history that subsequent git operations succeed: `fetch-depth: 0` and `persist-credentials: true` (the latter is needed for the workflow's own `GITHUB_TOKEN` to push tags back).
- Node version: match whatever the existing `release.yml` and `test.yml` workflows pin (likely Node 20 or 22; pin the same).
- Tag-move technique: create a detached commit whose tree includes the bundles, then `git tag -f <tag> <new-sha>` and `git push --force-with-lease origin refs/tags/<tag>`. `--force-with-lease` is preferred over plain `--force` for safety.
- Commit message convention: subject prefixed with `[release-bundle]` so future history readers can recognize these commits at a glance. Body should reference the tag and the source commit.
- Do not push anything to `main`. The release commit is detached; only the tag ref moves.

## Input Dependencies
- Task 1: `skills/` is at the repo root; `.gitignore` already ignores `skills/*/scripts/`, which is exactly what the workflow's `git add -f` overrides.

## Output Artifacts
- New `.github/workflows/release-skills.yml`.
- A reproducible release path: any `git push origin v<x.y.z>` produces a tag whose tree contains buildable `.cjs` bundles.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. **Confirm Node version pin used elsewhere**
   Open `.github/workflows/release.yml` and `.github/workflows/test.yml`; note the `node-version` they use. Use the same value here.

2. **Skeleton workflow**
   Create `.github/workflows/release-skills.yml` with this structure:
   ```yaml
   # release-skills.yml
   # Purpose: when a v* tag is pushed, build the skill bundles and rewrite the tag to point
   # at a detached commit that includes the built .cjs files. This makes the tagged ref a
   # self-contained installable input for `npx skills add e0ipso/ai-task-manager@<tag>` while
   # keeping `main` free of build output.
   #
   # Maintainer note: commits authored by this workflow are labeled [release-bundle] in the
   # subject. They are not on `main` and are reachable only from a tag ref.
   name: Release skills
   on:
     push:
       tags:
         - 'v*'
   permissions:
     contents: write
   jobs:
     release:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
           with:
             fetch-depth: 0
             persist-credentials: true
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: '<match-existing-workflows>'
             cache: 'npm'
         - name: Install
           run: npm ci
         - name: Build
           run: npm run build
         - name: Configure git identity
           run: |
             git config user.name 'github-actions[bot]'
             git config user.email 'github-actions[bot]@users.noreply.github.com'
         - name: Stage built bundles
           run: git add -f skills/*/scripts/*.cjs
         - name: Create release commit
           run: |
             TAG="${GITHUB_REF##*/}"
             SRC_SHA="$(git rev-parse HEAD)"
             git commit -m "[release-bundle] ${TAG}" -m "Source: ${SRC_SHA}"
         - name: Move tag to release commit
           run: |
             TAG="${GITHUB_REF##*/}"
             git tag -f "${TAG}" HEAD
             git push --force-with-lease origin "refs/tags/${TAG}"
   ```

3. **First-run dry-test plan**
   Per the plan's risk mitigation: before any real release, push a throwaway tag (`v0.0.0-test`) and confirm:
   ```bash
   git ls-tree -r v0.0.0-test -- 'skills/*/scripts/*.cjs' | wc -l    # expect: >= 1
   git ls-tree -r main -- 'skills/*/scripts/*.cjs'                   # expect: empty
   ```
   Delete the throwaway tag after verifying:
   ```bash
   git push origin :refs/tags/v0.0.0-test
   ```

4. **Optional: `release:skills` helper in `package.json`**
   The plan calls this out as optional. If included, it should be a short script that reproduces the build + git-add + commit steps locally for dry-runs. Skip unless time allows; the workflow is the source of truth.

5. **Verification**
   - `actionlint` (if available locally) or push the workflow on a branch and inspect the `gh workflow view` output before tagging.
   - Trigger on the throwaway tag, watch the run, verify the `git ls-tree` queries above.

**Pitfalls to avoid**:
- Do not target `main` with any push step. The release commit must remain detached.
- Do not use `--force` without `--force-with-lease` — `--force-with-lease` aborts the push if the remote tag advanced unexpectedly, preventing silent overwrite races.
- Do not skip the explanatory comment block; future maintainers reading `git log v<x.y.z>` will see anomalous bundles and need to know why.
- Do not commit the bundles to `main`. The `.gitignore` rule from task 1 is intentional — `git add -f` is the supported override only inside this workflow.
- Do not bake the Node version into a different value than `release.yml` uses; consistency across workflows avoids drift.

</details>
