# kenkeep Index: skills / prompts

↑ Parent: [skills](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) to learn about: Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill. #build #skill-prompts #architecture

## Components (what exists)
- Open [**Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler, shared partials**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) to learn about: src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored source; build-skill-prompts.cjs compiles them with Handlebars into templates/harness/skills/<name>/SKILL.md. #build #skill-prompts #source-of-truth #assembler #handlebars

## By topic

### #build
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill.
- Open [**SPA source changes require npm run build:web before serve reflects them**](../../dev/practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) — serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks.
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](../../web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
### #skill-prompts
- Open [**Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler, shared partials**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored source; build-skill-prompts.cjs compiles them with Handlebars into templates/harness/skills/<name>/SKILL.md.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill.
### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes four thin commands and no plan-management surface**](../map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — src/cli.ts registers init, export profile, serve, and validate; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #assembler
- Open [**Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler, shared partials**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored source; build-skill-prompts.cjs compiles them with Handlebars into templates/harness/skills/<name>/SKILL.md.
### #handlebars
- Open [**Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler, shared partials**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored source; build-skill-prompts.cjs compiles them with Handlebars into templates/harness/skills/<name>/SKILL.md.
### #source-of-truth
- Open [**Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler, shared partials**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored source; build-skill-prompts.cjs compiles them with Handlebars into templates/harness/skills/<name>/SKILL.md.