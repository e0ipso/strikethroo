# kenkeep Index: skills

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
- Load [`prompts/`](prompts/index.md) for more information on building SKILL.md from src/skill-prompts/ Handlebars sources — shared partials, the assembler, and the source-of-truth convention.

## Conventions (how we build)
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) to learn about: findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits. #workspace-root #cli #skill-scripts #serve #gotcha

## Components (what exists)
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) to learn about: Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it. #skills #invocation #harness
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) to learn about: Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs. #skill-scripts #workspace-root
- Open [**CLI exposes four thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) to learn about: src/cli.ts registers init, export profile, serve, and validate; there are no visualization/management (status, plan) commands. #cli #architecture
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) to learn about: All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic. #architecture #harness #skills

## By topic

### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes four thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — src/cli.ts registers init, export profile, serve, and validate; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #cli
- Open [**CLI exposes four thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — src/cli.ts registers init, export profile, serve, and validate; there are no visualization/management (status, plan) commands.
- Open [**Rebuild dist/ before running the suite — integration tests exec the compiled CLI**](../testing/practice-rebuild-dist-before-running-the-suite-integration-tests-exec-the-compiled-cli.md) — cli.integration.test.ts shells out to dist/cli.js, so a stale dist/ makes the suite fail against source that is already correct.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
### #harness
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](../release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
### #skill-scripts
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
- Open [**Phase derivation is implemented twice — viewer path and execution path**](../serve/map-phase-derivation-is-implemented-twice-viewer-path-and-execution-path.md) — src/serve/derivation.ts serves the read-only viewer; src/skill-scripts/shared/blueprint-parse.ts serves execution. A change to one does not reach the other.
### #skills
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](../release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
### #workspace-root
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
### #gotcha
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](../serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) — The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
- Open [**Add every new test file to the manual include list in vitest.config.ts**](../testing/practice-add-every-new-test-file-to-the-manual-include-list-in-vitest-config-ts.md) — vitest.config.ts enumerates test files explicitly rather than by glob, so an unlisted new test file is never collected and silently never runs.
### #invocation
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #serve
- Open [**Hot-reload dev loop requires three concurrent processes**](../dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](../dev/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](../dev/practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) — To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173.