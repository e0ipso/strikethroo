---
schema_version: 2
nodes_hash: 'sha256:21f245d8bcf0d8420b177b75a2ca34d52a143d6e0aab9d023f54f76bcadb2329'
node_count: 3
summary: >-
  building SKILL.md from src/skill-prompts/ source templates — shared sections,
  the assembler, and the source-of-truth convention
---
# kenkeep Index: skills / prompts

↑ Parent: [skills](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) to learn about: The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build. #build #skill-prompts #assembler
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) to learn about: Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill. #build #skill-prompts #architecture

## Components (what exists)
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) to learn about: src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}. #build #skill-prompts #source-of-truth #assembler #sections

## By topic

### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill.
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
### #skill-prompts
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill.
### #assembler
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes only init and serve commands**](../../map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #sections
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
### #source-of-truth
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
