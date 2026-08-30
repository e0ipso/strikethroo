# kenkeep Index: tooling

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**npm run lint only covers .ts files; .tsx web files need separate type-check**](practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check.md) to learn about: The lint script globs src/**/*.ts only, leaving src/web/**/*.tsx outside the automated gate. #web #lint #tsx #build
- Open [**src/web/vendor/ and dist-web/ are excluded from Prettier formatting**](practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting.md) to learn about: Vendored CSS under src/web/vendor/ must not be reformatted. Both src/web/vendor/ and dist-web/ are excluded via .prettierignore. #prettier #vendor #css #build

## Components (what exists)
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) to learn about: The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9. #eslint #tooling #config

## By topic

### #build
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](../skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill.
- Open [**SPA source changes require npm run build:web before serve reflects them**](../dev/practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) — serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks.
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](../web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
### #config
- Open [**.releaserc.json repositoryUrl must match current GitHub repo slug**](../release/map-releaserc-json-repositoryurl-must-match-current-github-repo-slug.md) — .releaserc.json's repositoryUrl feeds @semantic-release/github; it must match the current GitHub repo slug or releases fail.
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**Add every new test file to the manual include list in vitest.config.ts**](../testing/practice-add-every-new-test-file-to-the-manual-include-list-in-vitest-config-ts.md) — vitest.config.ts enumerates test files explicitly rather than by glob, so an unlisted new test file is never collected and silently never runs.
### #css
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](../web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) — All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens.
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](../web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) — Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink.
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](../web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
### #eslint
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](../git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**ESLint test block must include browser globals for page.evaluate callbacks**](../testing/practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks.md) — Playwright e2e tests use page.evaluate with browser globals (location, URL, document); the ESLint test block must include browserGlobals to avoid no-undef errors.
### #lint
- Open [**npm run lint only covers .ts files; .tsx web files need separate type-check**](practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check.md) — The lint script globs src/**/*.ts only, leaving src/web/**/*.tsx outside the automated gate.
### #prettier
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](../git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**src/web/vendor/ and dist-web/ are excluded from Prettier formatting**](practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting.md) — Vendored CSS under src/web/vendor/ must not be reformatted. Both src/web/vendor/ and dist-web/ are excluded via .prettierignore.
### #tooling
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](../git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**Hot-reload dev loop requires three concurrent processes**](../dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
### #tsx
- Open [**npm run lint only covers .ts files; .tsx web files need separate type-check**](practice-npm-run-lint-only-covers-ts-files-tsx-web-files-need-separate-type-check.md) — The lint script globs src/**/*.ts only, leaving src/web/**/*.tsx outside the automated gate.
### #vendor
- Open [**SPA vendor styles: five retained CSS files under src/web/vendor/styles/**](../web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md) — After the Plan 102 Tailwind migration, the CSS foundation is exactly five files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All component/screen CSS deleted.
- Open [**src/web/vendor/ and dist-web/ are excluded from Prettier formatting**](practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting.md) — Vendored CSS under src/web/vendor/ must not be reformatted. Both src/web/vendor/ and dist-web/ are excluded via .prettierignore.
### #web
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.