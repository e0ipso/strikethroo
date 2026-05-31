---
schema_version: 1
nodes_hash: 'sha256:1d028fd72cec9cfc8766562cde502a33e563c52c5451d3371901eb6c6ba07f90'
node_count: 43
---
# KB Index

_43 nodes • ~7255 estimated tokens_


## Conventions (how we build)
- **Deprecate the old npm package after first successful publish of the renamed package** [`nodes/practice/practice-deprecate-the-old-npm-package-after-first-successful-publish-of-the-renamed-package.md`] #npm #deprecate #rebrand
- **Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts** [`nodes/practice/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md`] #distribution #skills #gitignore
- **Documentation captures current state only** [`nodes/practice/practice-documentation-captures-current-state-only.md`] #documentation #conventions
- **Exclude README.md from skill-prompt template processing in the assembler** [`nodes/practice/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md`] #build #skill-prompts #assembler
- **Extract real font glyph outlines for favicon SVG rather than geometric approximation** [`nodes/practice/practice-extract-real-font-glyph-outlines-for-favicon-svg-rather-than-geometric-approximation.md`] #web #favicon #font #svg
- **First publish of a new npm package name requires NPM_TOKEN; OIDC trusted publishing fails** [`nodes/practice/practice-first-publish-of-a-new-npm-package-name-requires-npm-token-oidc-trusted-publishing-fails.md`] #npm #publish #oidc #ci
- **Hot-reload dev loop requires three concurrent processes** [`nodes/practice/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md`] #dev #tooling #web #serve
- **Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore** [`nodes/practice/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md`] #git #gitignore #workspace
- **Manual npm publish must be paired with a matching git tag to prevent semantic-release failure** [`nodes/practice/practice-manual-npm-publish-must-be-paired-with-a-matching-git-tag-to-prevent-semantic-release-failure.md`] #release #npm #semantic-release
- **Manual npm publish requires force-adding git-ignored skill artifacts into git** [`nodes/practice/practice-manual-npm-publish-requires-force-adding-git-ignored-skill-artifacts-into-git.md`] #release #npm #skills #git
- **npm run lint only covers .ts files; .tsx web files need separate type-check** [`nodes/practice/practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check.md`] #web #lint #tsx #build
- **Phase is reserved for execution blueprint task groups** [`nodes/practice/practice-phase-reserved-for-blueprint-task-groups.md`] #terminology #documentation #execution-blueprint
- **Pre-commit test hook prevents per-phase commits during multi-phase plan execution** [`nodes/practice/practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md`] #pre-commit #testing #phase #commits
- **Project commit hook rejects AI co-authorship attribution trailers** [`nodes/practice/practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md`] #git #commit #hooks #attribution
- **Serve layer mutation invariant: archive endpoint is the only route that writes workspace files** [`nodes/practice/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md`] #serve #architecture #testing #mutation
- **Serve layer uses discriminated-union result types, not custom error classes** [`nodes/practice/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md`] #serve #architecture #error-handling
- **SPA assets are prebuilt and force-added into release commit, never built at runtime** [`nodes/practice/practice-spa-assets-are-prebuilt-and-force-added-into-release-commit-never-built-at-runtime.md`] #web #spa #build #distribution #serve
- **SVG favicon must use hex color values, not oklch or hsl** [`nodes/practice/practice-svg-favicon-must-use-hex-color-values-not-oklch-or-hsl.md`] #web #favicon #svg
- **Update repositoryUrl in .releaserc.json after a GitHub repo rename** [`nodes/practice/practice-update-repositoryurl-in-releaserc-json-after-a-github-repo-rename.md`] #semantic-release #releaserc #ci
- **Use build-time composition to eliminate cross-skill prompt duplication** [`nodes/practice/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md`] #build #skill-prompts #architecture
- **Use git rm -r for tracked skill output dirs, not rm -rf** [`nodes/practice/practice-use-git-rm-r-for-tracked-skill-output-dirs-not-rm-rf.md`] #git #tracked-files #build-artifacts #skills
- **When renaming an npm package, bump to next semver major rather than deleting old git tags** [`nodes/practice/practice-when-renaming-an-npm-package-bump-to-next-semver-major-rather-than-deleting-old-git-tags.md`] #npm #release #semantic-release #versioning

## Components (what exists)
- **.releaserc.json repositoryUrl must match current GitHub repo slug** [`nodes/map/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md`] #releaserc #semantic-release #config
- **Archive UI control — confirmation-gated Archive button on done plans** [`nodes/map/map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md`] #web #plans #archive #ui
- **CLI exposes only init and serve commands; all visualization/management commands removed** [`nodes/map/map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md`] #cli #architecture
- **Cross-harness code abstraction centralized in ~54 lines across 3 locations** [`nodes/map/map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md`] #architecture #harness #skills
- **Dalia UI design system: vendored into src/web/vendor/, not a package dependency** [`nodes/map/map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency.md`] #web #spa #dalia #design-system
- **docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site** [`nodes/map/map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site.md`] #docs #github-pages #jekyll
- **find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root** [`nodes/map/map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md`] #skill-scripts #workspace-root
- **Installed skills in .claude/skills/ are decoupled from repo builds** [`nodes/map/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md`] #skills #installation #harness
- **Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications** [`nodes/map/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md`] #build #skill-prompts #sections
- **npm run dev:serve — ts-node backend hot-reload script** [`nodes/map/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md`] #web #serve #scripts #dev
- **Plan 95 — wire and fix serve UI interactions** [`nodes/map/map-plan-95-wire-and-fix-serve-ui-interactions.md`] #web #plans #ui #plan-95
- **scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates** [`nodes/map/map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates.md`] #build #skill-prompts #assembler #scripts
- **serve SPA design: read-only viewer with archive as the only write mutation** [`nodes/map/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md`] #web #spa #serve #architecture
- **serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/** [`nodes/map/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md`] #web #spa #serve #design #scratch
- **Skills are auto-loaded by intent matching, not slash-command prefix** [`nodes/map/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md`] #skills #invocation #harness
- **src/serve/archive.ts — archivePlan() operation** [`nodes/map/map-src-serve-archive-ts-archiveplan-operation.md`] #serve #archive #api
- **src/serve/self-review.ts — POST /api/self-review endpoint** [`nodes/map/map-src-serve-self-review-ts-post-api-self-review-endpoint.md`] #serve #self-review #api
- **src/skill-prompts/ is the authored source of truth for SKILL.md content** [`nodes/map/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md`] #build #skill-prompts #source-of-truth
- **src/web/public/favicon.svg — Strikethroo brand favicon** [`nodes/map/map-src-web-public-favicon-svg-strikethroo-brand-favicon.md`] #web #assets #favicon #brand
- **Two-channel release: npm tarball vs GitHub git tree** [`nodes/map/map-two-channel-release-npm-tarball-vs-github-git-tree.md`] #release #distribution #npm #skills
- **vercel-labs/skills installer scans standard dirs before plugin.json** [`nodes/map/map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json.md`] #distribution #skills #installer

## By topic

- **#web (12):** Archive UI control — confirmation-gated Archive button on done plans, Dalia UI design system: vendored into src/web/vendor/, not a package dependency, Extract real font glyph outlines for favicon SVG rather than geometric approximation, Hot-reload dev loop requires three concurrent processes, npm run dev:serve — ts-node backend hot-reload script, npm run lint only covers .ts files; .tsx web files need separate type-check, Plan 95 — wire and fix serve UI interactions, serve SPA design: read-only viewer with archive as the only write mutation, serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/, SPA assets are prebuilt and force-added into release commit, never built at runtime, src/web/public/favicon.svg — Strikethroo brand favicon, SVG favicon must use hex color values, not oklch or hsl
- **#serve (9):** Hot-reload dev loop requires three concurrent processes, npm run dev:serve — ts-node backend hot-reload script, Serve layer mutation invariant: archive endpoint is the only route that writes workspace files, Serve layer uses discriminated-union result types, not custom error classes, serve SPA design: read-only viewer with archive as the only write mutation, serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/, SPA assets are prebuilt and force-added into release commit, never built at runtime, src/serve/archive.ts — archivePlan() operation, src/serve/self-review.ts — POST /api/self-review endpoint
- **#skills (8):** Cross-harness code abstraction centralized in ~54 lines across 3 locations, Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts, Installed skills in .claude/skills/ are decoupled from repo builds, Manual npm publish requires force-adding git-ignored skill artifacts into git, Skills are auto-loaded by intent matching, not slash-command prefix, Two-channel release: npm tarball vs GitHub git tree, Use git rm -r for tracked skill output dirs, not rm -rf, vercel-labs/skills installer scans standard dirs before plugin.json
- **#build (7):** Exclude README.md from skill-prompt template processing in the assembler, Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications, npm run lint only covers .ts files; .tsx web files need separate type-check, scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates, SPA assets are prebuilt and force-added into release commit, never built at runtime, src/skill-prompts/ is the authored source of truth for SKILL.md content, Use build-time composition to eliminate cross-skill prompt duplication
- **#architecture (6):** CLI exposes only init and serve commands; all visualization/management commands removed, Cross-harness code abstraction centralized in ~54 lines across 3 locations, Serve layer mutation invariant: archive endpoint is the only route that writes workspace files, Serve layer uses discriminated-union result types, not custom error classes, serve SPA design: read-only viewer with archive as the only write mutation, Use build-time composition to eliminate cross-skill prompt duplication
- **#npm (6):** Deprecate the old npm package after first successful publish of the renamed package, First publish of a new npm package name requires NPM_TOKEN; OIDC trusted publishing fails, Manual npm publish must be paired with a matching git tag to prevent semantic-release failure, Manual npm publish requires force-adding git-ignored skill artifacts into git, Two-channel release: npm tarball vs GitHub git tree, When renaming an npm package, bump to next semver major rather than deleting old git tags
- **#skill-prompts (5):** Exclude README.md from skill-prompt template processing in the assembler, Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications, scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates, src/skill-prompts/ is the authored source of truth for SKILL.md content, Use build-time composition to eliminate cross-skill prompt duplication
- **#distribution (4):** Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts, SPA assets are prebuilt and force-added into release commit, never built at runtime, Two-channel release: npm tarball vs GitHub git tree, vercel-labs/skills installer scans standard dirs before plugin.json
- **#git (4):** Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore, Manual npm publish requires force-adding git-ignored skill artifacts into git, Project commit hook rejects AI co-authorship attribution trailers, Use git rm -r for tracked skill output dirs, not rm -rf
- **#release (4):** Manual npm publish must be paired with a matching git tag to prevent semantic-release failure, Manual npm publish requires force-adding git-ignored skill artifacts into git, Two-channel release: npm tarball vs GitHub git tree, When renaming an npm package, bump to next semver major rather than deleting old git tags
- **#semantic-release (4):** .releaserc.json repositoryUrl must match current GitHub repo slug, Manual npm publish must be paired with a matching git tag to prevent semantic-release failure, Update repositoryUrl in .releaserc.json after a GitHub repo rename, When renaming an npm package, bump to next semver major rather than deleting old git tags
- **#spa (4):** Dalia UI design system: vendored into src/web/vendor/, not a package dependency, serve SPA design: read-only viewer with archive as the only write mutation, serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/, SPA assets are prebuilt and force-added into release commit, never built at runtime
- **#favicon (3):** Extract real font glyph outlines for favicon SVG rather than geometric approximation, src/web/public/favicon.svg — Strikethroo brand favicon, SVG favicon must use hex color values, not oklch or hsl
- **#harness (3):** Cross-harness code abstraction centralized in ~54 lines across 3 locations, Installed skills in .claude/skills/ are decoupled from repo builds, Skills are auto-loaded by intent matching, not slash-command prefix
- **#api (2):** src/serve/archive.ts — archivePlan() operation, src/serve/self-review.ts — POST /api/self-review endpoint
- **#archive (2):** Archive UI control — confirmation-gated Archive button on done plans, src/serve/archive.ts — archivePlan() operation
- **#assembler (2):** Exclude README.md from skill-prompt template processing in the assembler, scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates
- **#ci (2):** First publish of a new npm package name requires NPM_TOKEN; OIDC trusted publishing fails, Update repositoryUrl in .releaserc.json after a GitHub repo rename
- **#dev (2):** Hot-reload dev loop requires three concurrent processes, npm run dev:serve — ts-node backend hot-reload script
- **#documentation (2):** Documentation captures current state only, Phase is reserved for execution blueprint task groups
- **#gitignore (2):** Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts, Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore
- **#plans (2):** Archive UI control — confirmation-gated Archive button on done plans, Plan 95 — wire and fix serve UI interactions
- **#releaserc (2):** .releaserc.json repositoryUrl must match current GitHub repo slug, Update repositoryUrl in .releaserc.json after a GitHub repo rename
- **#scripts (2):** npm run dev:serve — ts-node backend hot-reload script, scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates
- **#svg (2):** Extract real font glyph outlines for favicon SVG rather than geometric approximation, SVG favicon must use hex color values, not oklch or hsl
- **#testing (2):** Pre-commit test hook prevents per-phase commits during multi-phase plan execution, Serve layer mutation invariant: archive endpoint is the only route that writes workspace files
- **#ui (2):** Archive UI control — confirmation-gated Archive button on done plans, Plan 95 — wire and fix serve UI interactions
- **#assets (1):** src/web/public/favicon.svg — Strikethroo brand favicon
- **#attribution (1):** Project commit hook rejects AI co-authorship attribution trailers
- **#brand (1):** src/web/public/favicon.svg — Strikethroo brand favicon
- **#build-artifacts (1):** Use git rm -r for tracked skill output dirs, not rm -rf
- **#cli (1):** CLI exposes only init and serve commands; all visualization/management commands removed
- **#commit (1):** Project commit hook rejects AI co-authorship attribution trailers
- **#commits (1):** Pre-commit test hook prevents per-phase commits during multi-phase plan execution
- **#config (1):** .releaserc.json repositoryUrl must match current GitHub repo slug
- **#conventions (1):** Documentation captures current state only
- **#dalia (1):** Dalia UI design system: vendored into src/web/vendor/, not a package dependency
- **#deprecate (1):** Deprecate the old npm package after first successful publish of the renamed package
- **#design (1):** serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/
- **#design-system (1):** Dalia UI design system: vendored into src/web/vendor/, not a package dependency
- **#docs (1):** docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site
- **#error-handling (1):** Serve layer uses discriminated-union result types, not custom error classes
- **#execution-blueprint (1):** Phase is reserved for execution blueprint task groups
- **#font (1):** Extract real font glyph outlines for favicon SVG rather than geometric approximation
- **#github-pages (1):** docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site
- **#hooks (1):** Project commit hook rejects AI co-authorship attribution trailers
- **#installation (1):** Installed skills in .claude/skills/ are decoupled from repo builds
- **#installer (1):** vercel-labs/skills installer scans standard dirs before plugin.json
- **#invocation (1):** Skills are auto-loaded by intent matching, not slash-command prefix
- **#jekyll (1):** docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site
- **#lint (1):** npm run lint only covers .ts files; .tsx web files need separate type-check
- **#mutation (1):** Serve layer mutation invariant: archive endpoint is the only route that writes workspace files
- **#oidc (1):** First publish of a new npm package name requires NPM_TOKEN; OIDC trusted publishing fails
- **#phase (1):** Pre-commit test hook prevents per-phase commits during multi-phase plan execution
- **#plan-95 (1):** Plan 95 — wire and fix serve UI interactions
- **#pre-commit (1):** Pre-commit test hook prevents per-phase commits during multi-phase plan execution
- **#publish (1):** First publish of a new npm package name requires NPM_TOKEN; OIDC trusted publishing fails
- **#rebrand (1):** Deprecate the old npm package after first successful publish of the renamed package
- **#scratch (1):** serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/
- **#sections (1):** Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications
- **#self-review (1):** src/serve/self-review.ts — POST /api/self-review endpoint
- **#skill-scripts (1):** find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root
- **#source-of-truth (1):** src/skill-prompts/ is the authored source of truth for SKILL.md content
- **#terminology (1):** Phase is reserved for execution blueprint task groups
- **#tooling (1):** Hot-reload dev loop requires three concurrent processes
- **#tracked-files (1):** Use git rm -r for tracked skill output dirs, not rm -rf
- **#tsx (1):** npm run lint only covers .ts files; .tsx web files need separate type-check
- **#versioning (1):** When renaming an npm package, bump to next semver major rather than deleting old git tags
- **#workspace (1):** Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore
- **#workspace-root (1):** find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root
