# kenkeep Index: skills

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
- Load [`prompts/`](prompts/index.md) for more information on building SKILL.md from src/skill-prompts/ Handlebars sources — shared partials, the assembler, and the source-of-truth convention.

## Conventions (how we build)
- Open [**config.yaml is local, and empty means unconfigured**](practice-config-yaml-is-local-and-empty-means-unconfigured.md) to learn about: Init tracks config.yaml but gitignores it. hasYamlContent is duplicated in the SPA; change both. #config-yaml #execution-routing
- Open [**Task routing: one profile writer, strict dispatch**](practice-task-routing-and-harness-dispatch.md) to learn about: route-task-execution.cjs alone writes execution_profile. Dispatch never silently falls back on bad metadata. #execution-routing #dispatch
- Open [**Adding a skill means editing five registries**](practice-adding-a-skill-touches-five-registries.md) to learn about: Template, SKILL_ENTRYPOINTS, plugin.json, STRIKETHROO_WORKFLOW_SKILLS, EXPECTED_SKILLS. The mirror test blocks it until release. #skills #build
- Open [**Never use reasoning effort max in default routing profiles**](practice-never-use-reasoning-effort-max-in-default-routing-profiles.md) to learn about: The shipped config template caps reasoning effort at xhigh, for routing targets and harness cli_args defaults alike. Never max. #execution-routing #config-yaml #reasoning-effort #defaults
- Open [**Route workspace file access through safe-fs**](practice-route-workspace-file-access-through-safe-fs.md) to learn about: serve, the CLI, and skill bundles share safe-fs.ts for link-refusing reads and atomic writes. #safe-fs #security
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) to learn about: findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits. #workspace-root #cli #skill-scripts #serve #gotcha

## Components (what exists)
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) to learn about: Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it. #skills #invocation #harness
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) to learn about: Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs. #skill-scripts #workspace-root
- Open [**CLI exposes five thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) to learn about: src/cli.ts registers init, update, export profile, serve, and validate; there are no visualization/management (status, plan) commands. #cli #architecture
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) to learn about: All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic. #architecture #harness #skills

## By topic

### #execution-routing
- Open [**config.yaml is local, and empty means unconfigured**](practice-config-yaml-is-local-and-empty-means-unconfigured.md) — Init tracks config.yaml but gitignores it. hasYamlContent is duplicated in the SPA; change both.
- Open [**Never use reasoning effort max in default routing profiles**](practice-never-use-reasoning-effort-max-in-default-routing-profiles.md) — The shipped config template caps reasoning effort at xhigh, for routing targets and harness cli_args defaults alike. Never max.
- Open [**Task routing: one profile writer, strict dispatch**](practice-task-routing-and-harness-dispatch.md) — route-task-execution.cjs alone writes execution_profile. Dispatch never silently falls back on bad metadata.
### #skills
- Open [**Adding a skill means editing five registries**](practice-adding-a-skill-touches-five-registries.md) — Template, SKILL_ENTRYPOINTS, plugin.json, STRIKETHROO_WORKFLOW_SKILLS, EXPECTED_SKILLS. The mirror test blocks it until release.
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
### #architecture
- Open [**Serve layer uses discriminated-union result types for guarded operations**](../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — Archive, config-write, and self-review operations return typed result unions; route handlers map their variants to HTTP responses.
- Open [**CLI exposes five thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — src/cli.ts registers init, update, export profile, serve, and validate; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA has two sanctioned workspace mutations; self-review writes nothing**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — Archive moves done plans into archive/. Config writes overwrite one existing allowlisted file. Self-review spawns a process but writes no files.
### #cli
- Open [**CLI exposes five thin commands and no plan-management surface**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — src/cli.ts registers init, update, export profile, serve, and validate; there are no visualization/management (status, plan) commands.
- Open [**Rebuild dist/ before running the suite — integration tests exec the compiled CLI**](../testing/practice-rebuild-dist-before-running-the-suite-integration-tests-exec-the-compiled-cli.md) — cli.integration.test.ts shells out to dist/cli.js, so a stale dist/ makes the suite fail against source that is already correct.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
### #config-yaml
- Open [**config.yaml is local, and empty means unconfigured**](practice-config-yaml-is-local-and-empty-means-unconfigured.md) — Init tracks config.yaml but gitignores it. hasYamlContent is duplicated in the SPA; change both.
- Open [**Never use reasoning effort max in default routing profiles**](practice-never-use-reasoning-effort-max-in-default-routing-profiles.md) — The shipped config template caps reasoning effort at xhigh, for routing targets and harness cli_args defaults alike. Never max.
- Open [**Customize editors keep draft, baseline, and disk apart**](../web/editor/practice-config-editors-keep-draft-baseline-and-disk-apart.md) — configYaml.ts is the only YAML boundary; draftState.ts stops revalidation from overwriting typing.
### #harness
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](../release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
### #skill-scripts
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
- Open [**One blueprint parser serves the viewer, the validator, and execution**](../serve/map-phase-derivation-is-implemented-twice-viewer-path-and-execution-path.md) — parseBlueprintPhases lives once in src/skill-scripts/shared/blueprint-parse.ts and serves the viewer, the validator, and execution. Only inferPhases, the no-blueprint fallback, is viewer-only.
### #workspace-root
- Open [**find-strikethroo-root.ts — skill-scripts utility that locates the .ai/strikethroo workspace root**](map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md) — Entry point under src/skill-scripts/ that finds the .ai/strikethroo root. Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
### #build
- Open [**Adding a skill means editing five registries**](practice-adding-a-skill-touches-five-registries.md) — Template, SKILL_ENTRYPOINTS, plugin.json, STRIKETHROO_WORKFLOW_SKILLS, EXPECTED_SKILLS. The mirror test blocks it until release.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill.
- Open [**SPA source changes require npm run build:web before serve reflects them**](../dev/practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) — serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks.
### #defaults
- Open [**Never use reasoning effort max in default routing profiles**](practice-never-use-reasoning-effort-max-in-default-routing-profiles.md) — The shipped config template caps reasoning effort at xhigh, for routing targets and harness cli_args defaults alike. Never max.
### #dispatch
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](../code-review/map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
- Open [**Task routing: one profile writer, strict dispatch**](practice-task-routing-and-harness-dispatch.md) — route-task-execution.cjs alone writes execution_profile. Dispatch never silently falls back on bad metadata.
### #gotcha
- Open [**Add every new test file to the manual include list in vitest.config.ts**](../testing/practice-add-every-new-test-file-to-the-manual-include-list-in-vitest-config-ts.md) — vitest.config.ts enumerates test files explicitly rather than by glob, so an unlisted new test file is never collected and silently never runs.
- Open [**Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles**](practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles.md) — findStrikethrooRoot calls process.exit(1) on schema-version skew; resolveWorkspaceRoot returns a typed result and never exits.
- Open [**markdown.ts needs a private DOMPurify instance or mermaid loses every SVG attribute**](../web/rendering/practice-markdown-policy-needs-its-own-dompurify-instance.md) — markdown.ts registers its sanitize hooks on a private DOMPurify instance; on the shared default they also apply to mermaid's strict-mode SVG pass and blank the Graph tab.
### #invocation
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
### #reasoning-effort
- Open [**Never use reasoning effort max in default routing profiles**](practice-never-use-reasoning-effort-max-in-default-routing-profiles.md) — The shipped config template caps reasoning effort at xhigh, for routing targets and harness cli_args defaults alike. Never max.
### #safe-fs
- Open [**Route workspace file access through safe-fs**](practice-route-workspace-file-access-through-safe-fs.md) — serve, the CLI, and skill bundles share safe-fs.ts for link-refusing reads and atomic writes.
### #security
- Open [**Serve guards every request; mutations need a session token**](../serve/practice-serve-request-security-model.md) — guardRequest checks Host and origin. Mutations need the per-start token from GET /api/session.
- Open [**Route workspace file access through safe-fs**](practice-route-workspace-file-access-through-safe-fs.md) — serve, the CLI, and skill bundles share safe-fs.ts for link-refusing reads and atomic writes.
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](../serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #serve
- Open [**Hot-reload dev loop requires three concurrent processes**](../dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](../dev/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](../dev/practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) — To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173.