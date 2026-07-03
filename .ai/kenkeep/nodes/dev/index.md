---
schema_version: 2
nodes_hash: 'sha256:b92bacb290744f14dba5c5c1cf807e1b52e387c89298f1ba5f306f4ff60329e3'
node_count: 4
summary: >-
  the local development loop — dev:serve hot reload, the three concurrent
  processes, and rebuilding the SPA for serve
---
# kenkeep Index: dev

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Hot-reload dev loop requires three concurrent processes**](practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) to learn about: Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement. #dev #tooling #web #serve
- Open [**SPA source changes require npm run build:web before serve reflects them**](practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) to learn about: serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks. #spa #build #serve #dev-workflow
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) to learn about: To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173. #web #serve #dev #debugging

## Components (what exists)
- Open [**npm run dev:serve — ts-node backend hot-reload script**](map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) to learn about: Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement. #web #serve #scripts #dev

## By topic

### #serve
- Open [**Hot-reload dev loop requires three concurrent processes**](practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) — To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173.
### #dev
- Open [**Hot-reload dev loop requires three concurrent processes**](practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) — To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173.
### #web
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](../skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](../skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill.
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](../skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
### #debugging
- Open [**Start or reuse a dev:serve instance to visually debug the SPA**](practice-start-or-reuse-dev-serve-instance-to-visually-debug-the-spa.md) — To see/screenshot the SPA, reuse or start dev:serve on :4317; rebuild dist-web for source changes, or use dev:web HMR at :5173.
### #dev-workflow
- Open [**SPA source changes require npm run build:web before serve reflects them**](practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) — serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks.
### #scripts
- Open [**npm run dev:serve — ts-node backend hot-reload script**](map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
### #spa
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #tooling
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](../tooling/map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](../git/practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**Hot-reload dev loop requires three concurrent processes**](practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
