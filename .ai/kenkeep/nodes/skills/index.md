---
schema_version: 2
nodes_hash: 'sha256:8ee43b0f672793b2bd062a4020112841ff7237afb66209da00e628c2be7edebe'
node_count: 3
summary: >-
  the harness-agnostic Agent Skills system — intent-based loading, the
  skill-scripts root utility, and cross-harness abstraction
---
# kenkeep Index: skills

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
- Load [`prompts/`](prompts/index.md) for more information on building SKILL.md from src/skill-prompts/ source templates — shared sections, the assembler, and the source-of-truth convention.

## Conventions (how we build)
_None yet._

## Components (what exists)
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) to learn about: All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic. #architecture #harness #skills
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) to learn about: Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs. #skill-scripts #workspace-root
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) to learn about: Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it. #skills #invocation #harness

## By topic

### #harness
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](../release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #skills
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](../release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes only init and serve commands**](../map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #invocation
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #skill-scripts
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
### #workspace-root
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
