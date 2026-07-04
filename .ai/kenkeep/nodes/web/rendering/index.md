# kenkeep Index: web / rendering

↑ Parent: [web](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Reuse shared SPA prose-rendering components across all markdown-rendering screens**](practice-reuse-shared-spa-prose-rendering-components-across-all-markdown-rendering-screens.md) to learn about: The project has a standing code-reuse mandate: all markdown-rendering screens must use the shared Section/ReaderProse renderer. #web #spa #components #reuse #architecture
- Open [**Set suppressErrorRendering: true in mermaid initialization**](practice-set-suppresserrorrendering-true-in-mermaid-initialization.md) to learn about: Without this flag, mermaid v11 injects an orphaned error SVG into <body> on parse failure even when the caller catches the error. #mermaid #spa #rendering #error-handling

## Components (what exists)
- Open [**MermaidError.tsx — shared mermaid render-error component**](map-mermaiderror-tsx-shared-mermaid-render-error-component.md) to learn about: src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error. #mermaid #spa #components #error-handling

## By topic

### #spa
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #components
- Open [**Reuse shared SPA prose-rendering components across all markdown-rendering screens**](practice-reuse-shared-spa-prose-rendering-components-across-all-markdown-rendering-screens.md) — The project has a standing code-reuse mandate: all markdown-rendering screens must use the shared Section/ReaderProse renderer.
- Open [**Use BaseUI components for interactive UI elements in the SPA**](../ui/practice-use-baseui-components-for-interactive-ui-elements-in-the-spa.md) — @base-ui-components/react is required for all new interactive UI elements; hand-rolled components are pre-mandate legacy.
- Open [**MermaidError.tsx — shared mermaid render-error component**](map-mermaiderror-tsx-shared-mermaid-render-error-component.md) — src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error.
### #error-handling
- Open [**MermaidError.tsx — shared mermaid render-error component**](map-mermaiderror-tsx-shared-mermaid-render-error-component.md) — src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error.
- Open [**Set suppressErrorRendering: true in mermaid initialization**](practice-set-suppresserrorrendering-true-in-mermaid-initialization.md) — Without this flag, mermaid v11 injects an orphaned error SVG into <body> on parse failure even when the caller catches the error.
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
### #mermaid
- Open [**MermaidError.tsx — shared mermaid render-error component**](map-mermaiderror-tsx-shared-mermaid-render-error-component.md) — src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error.
- Open [**Set suppressErrorRendering: true in mermaid initialization**](practice-set-suppresserrorrendering-true-in-mermaid-initialization.md) — Without this flag, mermaid v11 injects an orphaned error SVG into <body> on parse failure even when the caller catches the error.
### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes only init and serve commands**](../../cli/map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #rendering
- Open [**Set suppressErrorRendering: true in mermaid initialization**](practice-set-suppresserrorrendering-true-in-mermaid-initialization.md) — Without this flag, mermaid v11 injects an orphaned error SVG into <body> on parse failure even when the caller catches the error.
### #reuse
- Open [**Reuse shared SPA prose-rendering components across all markdown-rendering screens**](practice-reuse-shared-spa-prose-rendering-components-across-all-markdown-rendering-screens.md) — The project has a standing code-reuse mandate: all markdown-rendering screens must use the shared Section/ReaderProse renderer.
### #web
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.