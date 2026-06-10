---
schema_version: 2
nodes_hash: 'sha256:9d215020e5bc2da464a3549ba722b192f05a293263ed0a50838950c3a230b4b8'
node_count: 7
summary: >-
  SPA styling — Tailwind v4 utilities, the @theme token layer, dark mode, and
  the vendored dalia CSS foundation
---
# kenkeep Index: web / styling

↑ Parent: [web](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) to learn about: Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode. #web #css #dalia #dark-mode #vendoring #tokens
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) to learn about: Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink. #dark-mode #css #tokens #theming
- Open [**Apply sticky positioning to .sb sidebar to keep footer visible on all pages**](web/styling/practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages.md) to learn about: Without sticky+100vh, .sb stretches to content height in the grid; its footer disappears below the fold on long plans. #web #css #layout #sidebar #app-shell
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) to learn about: A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build. #tailwind #css #comments #build
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) to learn about: All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens. #tailwind #tokens #css #dark-mode #spa

## Components (what exists)
- Open [**Dalia UI design system: vendored into src/web/vendor/, not a package dependency**](web/styling/map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency.md) to learn about: Dalia UI (@dalia/ui 0.1.0) is unpublished. Components and styles are copied into src/web/vendor/styles/ rather than declared as a dependency. #web #spa #dalia #design-system
- Open [**SPA vendor styles: five retained CSS files under src/web/vendor/styles/**](web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md) to learn about: After the Plan 102 Tailwind migration, the CSS foundation is exactly five files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All component/screen CSS deleted. #spa #styles #tailwind #tokens #vendor

## By topic

### #css
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) — All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens.
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) — Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink.
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
### #tokens
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) — All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens.
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) — Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink.
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
### #dark-mode
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) — Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink.
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) — All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens.
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
### #spa
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #tailwind
- Open [**Use @theme token utilities everywhere in the SPA; never arbitrary-value brackets for design values**](web/styling/practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f.md) — All SPA brand/status/signature values must be @theme-backed utilities (bg-cream, text-ink, etc.). Zero \[oklch\], \[var()\], or \[px\] bracket values for design tokens.
- Open [**SPA vendor styles: five retained CSS files under src/web/vendor/styles/**](web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md) — After the Plan 102 Tailwind migration, the CSS foundation is exactly five files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All component/screen CSS deleted.
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
### #web
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #dalia
- Open [**Dalia UI design system: vendored into src/web/vendor/, not a package dependency**](web/styling/map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency.md) — Dalia UI (@dalia/ui 0.1.0) is unpublished. Components and styles are copied into src/web/vendor/styles/ rather than declared as a dependency.
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
### #app-shell
- Open [**Apply sticky positioning to .sb sidebar to keep footer visible on all pages**](web/styling/practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages.md) — Without sticky+100vh, .sb stretches to content height in the grid; its footer disappears below the fold on long plans.
### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) — root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md.
- Open [**src/skill-prompts/ is the authored source of truth for SKILL.md content**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — Shared procedural sections live in src/skill-prompts/sections/; per-skill source templates live directly in src/skill-prompts/. Assembled SKILL.md files are build output.
### #comments
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
### #design-system
- Open [**Dalia UI design system: vendored into src/web/vendor/, not a package dependency**](web/styling/map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency.md) — Dalia UI (@dalia/ui 0.1.0) is unpublished. Components and styles are copied into src/web/vendor/styles/ rather than declared as a dependency.
### #layout
- Open [**Apply sticky positioning to .sb sidebar to keep footer visible on all pages**](web/styling/practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages.md) — Without sticky+100vh, .sb stretches to content height in the grid; its footer disappears below the fold on long plans.
### #sidebar
- Open [**Apply sticky positioning to .sb sidebar to keep footer visible on all pages**](web/styling/practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages.md) — Without sticky+100vh, .sb stretches to content height in the grid; its footer disappears below the fold on long plans.
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) — The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root.
### #styles
- Open [**SPA vendor styles: five retained CSS files under src/web/vendor/styles/**](web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md) — After the Plan 102 Tailwind migration, the CSS foundation is exactly five files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All component/screen CSS deleted.
### #theming
- Open [**Always-dark surfaces need explicit dark-mode color fixups when using dual-purpose tokens**](web/styling/practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos.md) — Tokens like --cream that flip in .dark break text on always-dark backgrounds. Add a scoped dark-mode rule to re-light them with --ink.
### #vendor
- Open [**SPA vendor styles: five retained CSS files under src/web/vendor/styles/**](web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md) — After the Plan 102 Tailwind migration, the CSS foundation is exactly five files: index.css, fonts.css, tokens.css, base.css, mermaid.css. All component/screen CSS deleted.
- Open [**src/web/vendor/ and dist-web/ are excluded from Prettier formatting**](tooling/practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting.md) — Vendored CSS under src/web/vendor/ must not be reformatted. Both src/web/vendor/ and dist-web/ are excluded via .prettierignore.
### #vendoring
- Open [**Dark mode requires both the foundational .dark token block and per-component fixups, both in tokens.css**](web/styling/practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups.md) — Both the @theme token block and the .dark palette-swap must live in tokens.css. Deleting CSS files without relocating these blocks silently breaks dark mode.
