---
schema_version: 2
nodes_hash: 'sha256:b0b74d01f4bd59903021d5231ffc41caf76a3bb2d8c2dfaa905ceece70458b89'
node_count: 5
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
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) to learn about: The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build. #build #skill-prompts #assembler
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) to learn about: Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill. #build #skill-prompts #architecture

## Components (what exists)
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) to learn about: root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md. #build #skill-prompts #sections
- Open [**scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates**](skills/prompts/map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates.md) to learn about: Standalone Node.js CommonJS script; resolves {{include}} directives recursively and {{variable}} substitutions, validates output, writes to templates/harness/skills/*/SKILL.md. #build #skill-prompts #assembler #scripts
- Open [**src/skill-prompts/ is the authored source of truth for SKILL.md content**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) to learn about: Shared procedural sections live in src/skill-prompts/sections/; per-skill source templates live directly in src/skill-prompts/. Assembled SKILL.md files are build output. #build #skill-prompts #source-of-truth

## By topic

### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) — root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md.
- Open [**src/skill-prompts/ is the authored source of truth for SKILL.md content**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — Shared procedural sections live in src/skill-prompts/sections/; per-skill source templates live directly in src/skill-prompts/. Assembled SKILL.md files are build output.
### #skill-prompts
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates**](skills/prompts/map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates.md) — Standalone Node.js CommonJS script; resolves {{include}} directives recursively and {{variable}} substitutions, validates output, writes to templates/harness/skills/*/SKILL.md.
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) — root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md.
### #assembler
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates**](skills/prompts/map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates.md) — Standalone Node.js CommonJS script; resolves {{include}} directives recursively and {{variable}} substitutions, validates output, writes to templates/harness/skills/*/SKILL.md.
### #architecture
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**Serve layer mutation invariant: archive endpoint is the only route that writes workspace files**](serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The correct invariant is not 'only non-GET route' but 'only route that mutates workspace files'. Self-review spawns a process but writes nothing.
### #scripts
- Open [**npm run dev:serve — ts-node backend hot-reload script**](dev/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
- Open [**scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/ source templates**](skills/prompts/map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates.md) — Standalone Node.js CommonJS script; resolves {{include}} directives recursively and {{variable}} substitutions, validates output, writes to templates/harness/skills/*/SKILL.md.
### #sections
- Open [**Nine shared section files under src/skill-prompts/sections/ cover the main cross-skill duplications**](skills/prompts/map-nine-shared-section-files-under-src-skill-prompts-sections-cover-the-main-cross-skill-duplications.md) — root-discovery.md, plan-resolution.md, task-minimization.md, granularity-skill-rules.md, test-philosophy.md, task-file-output.md, validation-checklist.md, phase-execution-loop.md, post-execution-archive.md.
### #source-of-truth
- Open [**src/skill-prompts/ is the authored source of truth for SKILL.md content**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — Shared procedural sections live in src/skill-prompts/sections/; per-skill source templates live directly in src/skill-prompts/. Assembled SKILL.md files are build output.
