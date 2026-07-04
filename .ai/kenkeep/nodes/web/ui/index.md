# kenkeep Index: web / ui

↑ Parent: [web](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) to learn about: In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable #web #ui #ux #accessibility #affordance
- Open [**Use BaseUI components for interactive UI elements in the SPA**](practice-use-baseui-components-for-interactive-ui-elements-in-the-spa.md) to learn about: @base-ui-components/react is required for all new interactive UI elements; hand-rolled components are pre-mandate legacy. #web #baseui #components #interactive #spa

## Components (what exists)
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) to learn about: Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh. #web #plans #archive #ui

## By topic

### #web
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #ui
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) — Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh.
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) — In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable
- Open [**CustomizeDetailRoute: title appends singular kind (hook or template, not hooks/templates)**](../editor/map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp.md) — The Customize detail page title formats as '<id> hook' or '<id> template'. The breadcrumb still uses the plural kind.
### #accessibility
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) — In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable
### #affordance
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) — In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable
### #archive
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) — Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh.
- Open [**src/serve/archive.ts — archivePlan() operation**](../../serve/map-src-serve-archive-ts-archiveplan-operation.md) — Pure discriminated-result function: validates plan exists, is under plans/, is in derived done state, then does atomic fs.rename into archive/.
### #baseui
- Open [**Use BaseUI components for interactive UI elements in the SPA**](practice-use-baseui-components-for-interactive-ui-elements-in-the-spa.md) — @base-ui-components/react is required for all new interactive UI elements; hand-rolled components are pre-mandate legacy.
### #components
- Open [**Reuse shared SPA prose-rendering components across all markdown-rendering screens**](../rendering/practice-reuse-shared-spa-prose-rendering-components-across-all-markdown-rendering-screens.md) — The project has a standing code-reuse mandate: all markdown-rendering screens must use the shared Section/ReaderProse renderer.
- Open [**Use BaseUI components for interactive UI elements in the SPA**](practice-use-baseui-components-for-interactive-ui-elements-in-the-spa.md) — @base-ui-components/react is required for all new interactive UI elements; hand-rolled components are pre-mandate legacy.
- Open [**MermaidError.tsx — shared mermaid render-error component**](../rendering/map-mermaiderror-tsx-shared-mermaid-render-error-component.md) — src/web/plans/detail/MermaidError.tsx renders a Lucide Frown icon with a collapsed Details disclosure for the verbatim parse error.
### #interactive
- Open [**Use BaseUI components for interactive UI elements in the SPA**](practice-use-baseui-components-for-interactive-ui-elements-in-the-spa.md) — @base-ui-components/react is required for all new interactive UI elements; hand-rolled components are pre-mandate legacy.
### #plans
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) — Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh.
### #spa
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #ux
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) — In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable