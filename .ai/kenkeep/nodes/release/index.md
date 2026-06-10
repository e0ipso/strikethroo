---
schema_version: 2
nodes_hash: 'sha256:c865b8c37ed5c67cd9ac87ef44817c5c785c6e448646bb38dbbd7efc7dff0d58'
node_count: 9
summary: >-
  releasing and distribution — semantic-release, the npm-tarball vs
  GitHub-git-tree channels, and skill-artifact force-adding
---
# kenkeep Index: release

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts**](release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md) to learn about: \`.agents/skills/\` and \`skills-lock.json\` are produced by running \`npx skills add\` locally and must be gitignored, not committed. #distribution #skills #gitignore
- Open [**Manual npm publish must be paired with a matching git tag to prevent semantic-release failure**](release/practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure.md) to learn about: Without a matching vX.Y.Z tag, semantic-release on the next push tries the same version again and gets a 403 from npm. #release #npm #semantic-release
- Open [**Manual npm publish requires force-adding git-ignored skill artifacts into git**](release/practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git.md) to learn about: When bypassing semantic-release, manually force-add SKILL.md and .cjs bundles into git before tagging, or npx skills add finds no skills. #release #npm #skills #git
- Open [**SPA (dist-web/) ships only via the npm tarball, not force-added into git**](release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md) to learn about: dist-web/ stays out of the @semantic-release/git assets glob; it ships only via the npm tarball, unlike the git-force-added skill bundles. #web #spa #build #distribution #serve #semantic-release
- Open [**Use git rm -r for tracked skill output dirs, not rm -rf**](release/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md) to learn about: Release commits force-add skill bundles and SKILL.md files, making them tracked at HEAD. Removing them requires git rm -r, not rm -rf. #git #tracked-files #build-artifacts #skills

## Components (what exists)
- Open [**Two-channel release: npm tarball vs GitHub git tree**](release/map-two-channel-release-npm-tarball-vs-github-git-tree.md) to learn about: \`npm publish\` populates the tarball; \`npx skills add\` resolves from the GitHub git tree. Both must be populated on every release. #release #distribution #npm #skills
- Open [**.releaserc.json repositoryUrl must match current GitHub repo slug**](release/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md) to learn about: .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match the current GitHub repo slug or releases fail. #releaserc #semantic-release #config
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) to learn about: Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall. #skills #installation #harness
- Open [**vercel-labs/skills installer scans standard dirs before plugin.json**](release/map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json.md) to learn about: The installer checks \`.agents/skills/\`, \`.claude/skills/\`, etc. in priority order before falling back to \`.claude-plugin/plugin.json\` manifest paths. #distribution #skills #installer

## By topic

### #skills
- Open [**Two-channel release: npm tarball vs GitHub git tree**](release/map-two-channel-release-npm-tarball-vs-github-git-tree.md) — \`npm publish\` populates the tarball; \`npx skills add\` resolves from the GitHub git tree. Both must be populated on every release.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](skills/map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #distribution
- Open [**Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts**](release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md) — \`.agents/skills/\` and \`skills-lock.json\` are produced by running \`npx skills add\` locally and must be gitignored, not committed.
- Open [**vercel-labs/skills installer scans standard dirs before plugin.json**](release/map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json.md) — The installer checks \`.agents/skills/\`, \`.claude/skills/\`, etc. in priority order before falling back to \`.claude-plugin/plugin.json\` manifest paths.
- Open [**Two-channel release: npm tarball vs GitHub git tree**](release/map-two-channel-release-npm-tarball-vs-github-git-tree.md) — \`npm publish\` populates the tarball; \`npx skills add\` resolves from the GitHub git tree. Both must be populated on every release.
### #npm
- Open [**Two-channel release: npm tarball vs GitHub git tree**](release/map-two-channel-release-npm-tarball-vs-github-git-tree.md) — \`npm publish\` populates the tarball; \`npx skills add\` resolves from the GitHub git tree. Both must be populated on every release.
- Open [**Manual npm publish requires force-adding git-ignored skill artifacts into git**](release/practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git.md) — When bypassing semantic-release, manually force-add SKILL.md and .cjs bundles into git before tagging, or npx skills add finds no skills.
- Open [**Manual npm publish must be paired with a matching git tag to prevent semantic-release failure**](release/practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure.md) — Without a matching vX.Y.Z tag, semantic-release on the next push tries the same version again and gets a 403 from npm.
### #release
- Open [**Two-channel release: npm tarball vs GitHub git tree**](release/map-two-channel-release-npm-tarball-vs-github-git-tree.md) — \`npm publish\` populates the tarball; \`npx skills add\` resolves from the GitHub git tree. Both must be populated on every release.
- Open [**Manual npm publish requires force-adding git-ignored skill artifacts into git**](release/practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git.md) — When bypassing semantic-release, manually force-add SKILL.md and .cjs bundles into git before tagging, or npx skills add finds no skills.
- Open [**Manual npm publish must be paired with a matching git tag to prevent semantic-release failure**](release/practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure.md) — Without a matching vX.Y.Z tag, semantic-release on the next push tries the same version again and gets a 403 from npm.
### #semantic-release
- Open [**.releaserc.json repositoryUrl must match current GitHub repo slug**](release/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md) — .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match the current GitHub repo slug or releases fail.
- Open [**Manual npm publish must be paired with a matching git tag to prevent semantic-release failure**](release/practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure.md) — Without a matching vX.Y.Z tag, semantic-release on the next push tries the same version again and gets a 403 from npm.
- Open [**SPA (dist-web/) ships only via the npm tarball, not force-added into git**](release/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md) — dist-web/ stays out of the @semantic-release/git assets glob; it ships only via the npm tarball, unlike the git-force-added skill bundles.
### #git
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](git/practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](git/practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
- Open [**Do not use --no-verify to skip git commit hooks**](git/practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) — root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md.
- Open [**src/skill-prompts/ is the authored source of truth for SKILL.md content**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — Shared procedural sections live in src/skill-prompts/sections/; per-skill source templates live directly in src/skill-prompts/. Assembled SKILL.md files are build output.
### #build-artifacts
- Open [**Use git rm -r for tracked skill output dirs, not rm -rf**](release/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md) — Release commits force-add skill bundles and SKILL.md files, making them tracked at HEAD. Removing them requires git rm -r, not rm -rf.
### #config
- Open [**.releaserc.json repositoryUrl must match current GitHub repo slug**](release/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md) — .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match the current GitHub repo slug or releases fail.
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](tooling/map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
### #gitignore
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
- Open [**Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts**](release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md) — \`.agents/skills/\` and \`skills-lock.json\` are produced by running \`npx skills add\` locally and must be gitignored, not committed.
- Open [**Integration and e2e tests must use the committed fixture workspace, not the live .ai/strikethroo/**](testing/practice-integration-and-e2e-tests-must-use-the-committed-fixture-workspace-not-the-live.md) — Tests reading .ai/strikethroo/ directly only pass locally; CI has no workspace on clean checkout. All tests must use src/__tests__/fixtures/serve-workspace/.
### #harness
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](skills/map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #installation
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
### #installer
- Open [**vercel-labs/skills installer scans standard dirs before plugin.json**](release/map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json.md) — The installer checks \`.agents/skills/\`, \`.claude/skills/\`, etc. in priority order before falling back to \`.claude-plugin/plugin.json\` manifest paths.
### #releaserc
- Open [**.releaserc.json repositoryUrl must match current GitHub repo slug**](release/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md) — .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match the current GitHub repo slug or releases fail.
### #serve
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Hot-reload dev loop requires three concurrent processes**](dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](dev/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
### #spa
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #tracked-files
- Open [**Use git rm -r for tracked skill output dirs, not rm -rf**](release/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md) — Release commits force-add skill bundles and SKILL.md files, making them tracked at HEAD. Removing them requires git rm -r, not rm -rf.
### #web
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
