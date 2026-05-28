---
id: 5
group: "documentation"
dependencies: [1, 2, 3, 4]
status: "completed"
created: 2026-05-20
skills:
  - markdown
---
# Document the two-step install, schema-version contract, release workflow, and migration paths

## Objective
Refresh user-facing documentation so a first-time visitor immediately learns the two-step install (`npx skills add` then `npx @e0ipso/ai-task-manager init`), understands the schema-version contract, can find the release workflow's "why" and verification commands in `AGENTS.md`, and has a single concise `MIGRATION.md` covering the upgrade flows and error-message recovery paths.

## Skills Required
- `markdown` — README/AGENTS.md/MIGRATION.md edits and additions.

## Acceptance Criteria
- [ ] `README.md` leads with a two-step install block: first `npx skills add e0ipso/ai-task-manager`, then `npx @e0ipso/ai-task-manager init`. Includes a short paragraph (2-4 sentences) explaining why the install is split across two channels.
- [ ] `AGENTS.md` "Skills Layer" section paths read `skills/` (path edits already landed in task 1; this task verifies and finalizes the narrative).
- [ ] `AGENTS.md` gains a new "Schema Version Contract" subsection covering: the `workspaceSchemaVersion` field, the two mismatch error messages (quoted verbatim), and the rule for bumping the version (only on incompatible workspace shape changes).
- [ ] `AGENTS.md` gains a new "GitHub Releases" subsection covering: the `release-skills.yml` workflow, the `main` vs. tag invariant, and the `git ls-tree` verification commands.
- [ ] `MIGRATION.md` (new file at repo root) exists and covers: updating skills (`npx skills add`), updating workspace (`npx … init`), what the diff-on-conflict prompt means during `init`, and what each of the two schema-mismatch errors means and how to resolve it. Pins a known-good `vercel-labs/skills` version per the plan's risk mitigation.
- [ ] `README.md` links to `MIGRATION.md` (a single inline link is sufficient).
- [ ] No documentation file references `templates/skills/` (final grep cleanup).

## Technical Requirements
- Doc content must reference the exact error message strings produced by task 3 — copy them verbatim so users can grep their terminal output against the docs.
- `MIGRATION.md` should be concise (single page; aim for under 200 lines). It is a quick-reference, not a tutorial.
- The "Schema Version Contract" subsection should make clear that the version is an integer (not semver), that `1` is the initial value, and that absent values are backfilled to `1`.
- The "GitHub Releases" subsection should include both the maintainer-facing release flow and the user-facing `npx skills add e0ipso/ai-task-manager@<tag>` syntax.
- Pin the `vercel-labs/skills` version in `MIGRATION.md` (look up the latest known-good tag at write time; if unverified, leave a clear "TODO: verify latest release" placeholder rather than guessing).

## Input Dependencies
- Task 1: skill path migrated to `skills/`; AGENTS.md path mentions already corrected.
- Task 2: `workspaceSchemaVersion` field exists and is written by `init`.
- Task 3: exact error messages are committed and can be quoted verbatim.
- Task 4: release workflow exists and verification commands are known.

## Output Artifacts
- Updated `README.md`.
- Updated `AGENTS.md` with two new subsections.
- New `MIGRATION.md` at repo root.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. **README.md — two-step install**
   At the top of the install section (or in a new "Getting Started" block immediately under the project description), replace any single-step `npx @e0ipso/ai-task-manager init` instructions with:
   ```markdown
   ## Install

   This project ships in two parts: the skills (installed by [vercel-labs/skills](https://github.com/vercel-labs/skills)) and the workspace (initialized by this CLI). Run both:

   ```bash
   npx skills add e0ipso/ai-task-manager
   npx @e0ipso/ai-task-manager init --assistants claude --destination-directory .
   ```

   The skills give your assistant the workflow commands; the CLI bootstraps `.ai/task-manager/` with hooks and templates. Each step is independently re-runnable. See [MIGRATION.md](./MIGRATION.md) for upgrade flows and recovery from schema-mismatch errors.
   ```
   Adjust prose to match the existing README voice. The example uses `--assistants claude`; if the README already documents multi-assistant init, surface that too.

2. **AGENTS.md — verify path migration**
   Confirm task 1 left no `templates/skills` references. Run `git grep -F 'templates/skills' AGENTS.md`; expect zero matches.

3. **AGENTS.md — "Schema Version Contract" subsection**
   Add (under the "Skills Layer" section or as a new top-level section, matching the existing AGENTS.md outline):
   ```markdown
   ### Schema Version Contract

   `.ai/task-manager/.init-metadata.json` carries a `workspaceSchemaVersion` integer (initial value `1`). It is distinct from the CLI's `version` string and changes only when the workspace shape (hook names, required templates, directory structure) changes incompatibly.

   Skills bake an `EXPECTED_WORKSPACE_SCHEMA_VERSION` literal into each shipped `.cjs` bundle. At runtime the resolver compares the workspace value against the baked value:

   - **Workspace older than skill** (`<actual>` < `<expected>`):
     `Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update.`
   - **Workspace newer than skill** (`<actual>` > `<expected>`):
     `This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills.`

   Absent values in older metadata files are backfilled to `1` on read. Bump the constant in `src/metadata.ts` (`CURRENT_WORKSPACE_SCHEMA_VERSION`) only when the workspace shape genuinely changes incompatibly.
   ```

4. **AGENTS.md — "GitHub Releases" subsection**
   ```markdown
   ### GitHub Releases

   `release-skills.yml` is triggered by `v*` tag pushes. It runs the full build and force-adds the otherwise git-ignored `.cjs` bundles into a detached release commit, then force-moves the tag to point at that commit. `main` stays bundle-free; the tagged ref is self-contained so `npx skills add e0ipso/ai-task-manager@<tag>` resolves a fully buildable input.

   Verify the invariant:
   ```bash
   git ls-tree -r v<tag> -- 'skills/*/scripts/*.cjs'   # expect: bundles listed
   git ls-tree -r main -- 'skills/*/scripts/*.cjs'     # expect: empty
   ```

   Release commits are labeled `[release-bundle]` in the subject. They are reachable only from a tag, never from `main`.
   ```

5. **MIGRATION.md (new, repo root)**
   ```markdown
   # Migration

   This project ships in two channels:

   1. **Skills** — installed by [vercel-labs/skills](https://github.com/vercel-labs/skills) (pinned: `<known-good-version-or-TODO>`).
   2. **Workspace** — initialized by `@e0ipso/ai-task-manager`'s `init` subcommand.

   Each is independently versioned and independently re-runnable.

   ## Update skills

   ```bash
   npx skills add e0ipso/ai-task-manager
   ```

   This walks the latest release tag of `e0ipso/ai-task-manager` and copies the `skills/<name>/` directories into the per-agent location your installed `skills` CLI knows about.

   ## Update workspace

   ```bash
   npx @e0ipso/ai-task-manager init --assistants <list> --destination-directory <path>
   ```

   Re-running `init` is safe. Modified files surface a diff-on-conflict prompt with keep/overwrite options (see below).

   ## Diff-on-conflict prompt

   `init` tracks file hashes in `.init-metadata.json`. When a re-run would overwrite a file you've modified, it prompts you to keep your version or accept the new one. The prompt fires per-file; you can `--force` to accept all overwrites non-interactively.

   ## Schema-mismatch errors

   Skill scripts compare the workspace's `workspaceSchemaVersion` against the version baked into the skill bundle. Two messages can fire:

   - `Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update.`
     → Workspace is behind the skill. Run `init` with the latest CLI.
   - `This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills.`
     → Skill bundles are behind the workspace. Re-add skills.

   ## Manual fallback (if `vercel-labs/skills` is unavailable)

   ```bash
   git clone --depth 1 -b <tag> https://github.com/e0ipso/ai-task-manager /tmp/atm
   cp -r /tmp/atm/skills/<name>/ .claude/skills/<name>/
   ```
   ```

6. **Final grep**
   ```bash
   git grep -F 'templates/skills' -- '*.md'
   # expect: empty
   ```

**Pitfalls to avoid**:
- Do not paraphrase the schema-mismatch error messages. They must match what task 3 emits exactly so users can grep their terminals against the docs.
- Do not duplicate the `Schema Version Contract` content between `AGENTS.md` and `MIGRATION.md`. AGENTS.md is for contributors (the why and the bump rule); MIGRATION.md is for users (the error and the fix). Cross-link instead.
- Do not guess at a `vercel-labs/skills` pinned version. If you can't verify the latest release at write time, leave a clearly-marked `TODO` rather than fabricate a tag.
- Do not document a `migrate` subcommand. The plan explicitly drops that scope; the only documented recovery is to re-run `init` or `skills add`.

</details>
