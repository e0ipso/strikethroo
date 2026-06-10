---
schema_version: 2
nodes_hash: 'sha256:b53dc4a4f50681120f8e15776cf6a605f5bd742ba764d7e3f1262732c5f73ee8'
node_count: 10
summary: >-
  the read-only serve backend — HTTP/JSON API routes, the workspace data model
  and derivation, and the archive and self-review operations
---
# kenkeep Index: serve

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) to learn about: Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated #web #spa #serve #plan-detail #execution-blueprint
- Open [**Serve layer mutation invariant: archive endpoint is the only route that writes workspace files**](serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) to learn about: The correct invariant is not 'only non-GET route' but 'only route that mutates workspace files'. Self-review spawns a process but writes nothing. #serve #architecture #testing #mutation
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) to learn about: AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union. #serve #architecture #error-handling
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) to learn about: The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only. #routing #serve #security #plan-id #spa

## Components (what exists)
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) to learn about: The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root. #serve #api #capabilities #sidebar #project
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) to learn about: The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase. #serve #blueprint #parser #derivation #gotcha
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) to learn about: The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/. #web #spa #serve #architecture
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) to learn about: The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow. #web #spa #serve #design #scratch
- Open [**src/serve/archive.ts — archivePlan() operation**](serve/map-src-serve-archive-ts-archiveplan-operation.md) to learn about: Pure discriminated-result function: validates plan exists, is under plans/, is in derived done state, then does atomic fs.rename into archive/. #serve #archive #api
- Open [**src/serve/self-review.ts — POST /api/self-review endpoint**](serve/map-src-serve-self-review-ts-post-api-self-review-endpoint.md) to learn about: Spawns an external reviewer binary; writes nothing to the workspace. Returns LaunchResult discriminated union. Also adds GET /api/capabilities. #serve #self-review #api

## By topic

### #serve
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Hot-reload dev loop requires three concurrent processes**](dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
- Open [**npm run dev:serve — ts-node backend hot-reload script**](dev/map-npm-run-dev-serve-ts-node-backend-hot-reload-script.md) — Runs src/cli.ts serve via ts-node with node --watch; restarts on src/ changes; no dist/ involvement.
### #spa
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #api
- Open [**src/serve/archive.ts — archivePlan() operation**](serve/map-src-serve-archive-ts-archiveplan-operation.md) — Pure discriminated-result function: validates plan exists, is under plans/, is in derived done state, then does atomic fs.rename into archive/.
- Open [**src/serve/self-review.ts — POST /api/self-review endpoint**](serve/map-src-serve-self-review-ts-post-api-self-review-endpoint.md) — Spawns an external reviewer binary; writes nothing to the workspace. Returns LaunchResult discriminated union. Also adds GET /api/capabilities.
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) — The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root.
### #architecture
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**Serve layer mutation invariant: archive endpoint is the only route that writes workspace files**](serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The correct invariant is not 'only non-GET route' but 'only route that mutates workspace files'. Self-review spawns a process but writes nothing.
### #web
- Open [**serve SPA design: read-only viewer with archive as the only write mutation**](serve/map-serve-spa-design-read-only-viewer-with-archive-as-the-only-write-mutation.md) — The serve web app is strictly read-only except for archive: POST /api/plans/:id/archive moves a done plan to archive/.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #archive
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](web/ui/map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) — Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh.
- Open [**src/serve/archive.ts — archivePlan() operation**](serve/map-src-serve-archive-ts-archiveplan-operation.md) — Pure discriminated-result function: validates plan exists, is under plans/, is in derived done state, then does atomic fs.rename into archive/.
### #blueprint
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) — The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase.
### #capabilities
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) — The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root.
### #derivation
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) — The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase.
### #design
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #error-handling
- Open [**MermaidError.tsx — shared mermaid render-error component**](web/rendering/map-mermaiderror-tsx-shared-mermaid-render-error-component.md) — src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error.
- Open [**Set suppressErrorRendering: true in mermaid initialization**](web/rendering/practice-set-suppresserrorrendering-true-in-mermaid-initialization.md) — Without this flag, mermaid v11 injects an orphaned error SVG into <body> on parse failure even when the caller catches the error.
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
### #execution-blueprint
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**Phase is reserved for execution blueprint task groups**](conventions/practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
### #gotcha
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) — The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase.
### #mutation
- Open [**Serve layer mutation invariant: archive endpoint is the only route that writes workspace files**](serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The correct invariant is not 'only non-GET route' but 'only route that mutates workspace files'. Self-review spawns a process but writes nothing.
### #parser
- Open [**parseBlueprintPhases slices blueprint section to end-of-document**](serve/map-parseblueprintphases-slices-blueprint-section-to-end-of-document.md) — The blueprint parser slices from ## Execution Blueprint to EOF, so an appended ## Execution Summary with Task NN bullets is miscounted as task references in the last phase.
### #plan-detail
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
### #plan-id
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #project
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) — The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root.
### #routing
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #scratch
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #security
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #self-review
- Open [**src/serve/self-review.ts — POST /api/self-review endpoint**](serve/map-src-serve-self-review-ts-post-api-self-review-endpoint.md) — Spawns an external reviewer binary; writes nothing to the workspace. Returns LaunchResult discriminated union. Also adds GET /api/capabilities.
### #sidebar
- Open [**Apply sticky positioning to .sb sidebar to keep footer visible on all pages**](web/styling/practice-apply-sticky-positioning-to-sb-sidebar-to-keep-footer-visible-on-all-pages.md) — Without sticky+100vh, .sb stretches to content height in the grid; its footer disappears below the fold on long plans.
- Open [**GET /api/capabilities returns project name and path via deriveProject()**](serve/map-get-api-capabilities-returns-project-name-and-path-via-deriveproject.md) — The capabilities endpoint exposes { selfReview, project: { name, path } }. deriveProject(root) resolves the project directory two levels up from the .ai/strikethroo root.
### #testing
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
- Open [**src/__tests__/fixtures/serve-workspace/ — committed fixture workspace for tests**](testing/map-src-tests-fixtures-serve-workspace-committed-fixture-workspace-for-tests.md) — Committed fixture workspace at src/__tests__/fixtures/serve-workspace/ is the hermetic replacement for the gitignored live .ai/strikethroo/ in all integration and e2e suites.
