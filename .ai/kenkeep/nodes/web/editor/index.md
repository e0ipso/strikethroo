# kenkeep Index: web / editor

↑ Parent: [web](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) to learn about: CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor. #vite #codemirror #dev-server #lazy-loading #optimization
- Open [**All CodeMirror packages must stay in devDependencies and be imported lazily**](practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily.md) to learn about: CodeMirror packages are build-time only and must never move to runtime dependencies. All four packages are loaded inside a single React.lazy import boundary. #codemirror #spa #devdependencies #lazy-loading

## Components (what exists)
- Open [**CustomizeDetailRoute: title appends singular kind (hook or template, not hooks/templates)**](map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp.md) to learn about: The Customize detail page title formats as '<id> hook' or '<id> template'. The breadcrumb still uses the plural kind. #customize #spa #ui
- Open [**MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize detail route**](map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r.md) to learn about: src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6 editor with @codemirror/language-data for lazy fenced-code-block highlighting. #codemirror #spa #customize #editor

## By topic

### #codemirror
- Open [**All CodeMirror packages must stay in devDependencies and be imported lazily**](practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily.md) — CodeMirror packages are build-time only and must never move to runtime dependencies. All four packages are loaded inside a single React.lazy import boundary.
- Open [**MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize detail route**](map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r.md) — src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6 editor with @codemirror/language-data for lazy fenced-code-block highlighting.
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) — CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor.
### #spa
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #customize
- Open [**CustomizeDetailRoute: title appends singular kind (hook or template, not hooks/templates)**](map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp.md) — The Customize detail page title formats as '<id> hook' or '<id> template'. The breadcrumb still uses the plural kind.
- Open [**MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize detail route**](map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r.md) — src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6 editor with @codemirror/language-data for lazy fenced-code-block highlighting.
### #lazy-loading
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) — CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor.
- Open [**All CodeMirror packages must stay in devDependencies and be imported lazily**](practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily.md) — CodeMirror packages are build-time only and must never move to runtime dependencies. All four packages are loaded inside a single React.lazy import boundary.
### #dev-server
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) — CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor.
### #devdependencies
- Open [**All CodeMirror packages must stay in devDependencies and be imported lazily**](practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily.md) — CodeMirror packages are build-time only and must never move to runtime dependencies. All four packages are loaded inside a single React.lazy import boundary.
### #editor
- Open [**MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize detail route**](map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r.md) — src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6 editor with @codemirror/language-data for lazy fenced-code-block highlighting.
### #optimization
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) — CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor.
### #ui
- Open [**Archive UI control — confirmation-gated Archive button on done plans**](../ui/map-archive-ui-control-confirmation-gated-archive-button-on-done-plans.md) — Done plans get an Archive button wired to ArchivePlanModal; POST /api/plans/:id/archive triggers SSE-driven UI refresh.
- Open [**Convey done/undone state with strikethrough, color, or emoji — never a non-interactive checkbox**](../ui/practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes.md) — In read-only UI, render Done/Undone with a passive visual cue (strikethrough, text color, emoji); a checkbox implies it is clickable
- Open [**CustomizeDetailRoute: title appends singular kind (hook or template, not hooks/templates)**](map-customizedetailroute-title-appends-singular-kind-hook-or-template-not-hooks-temp.md) — The Customize detail page title formats as '<id> hook' or '<id> template'. The breadcrumb still uses the plural kind.
### #vite
- Open [**Add lazy-only CodeMirror packages to vite optimizeDeps.include to prevent dev-server MIME errors**](practice-add-lazy-only-codemirror-packages-to-vite-optimizedeps-include-to-prevent-dev-se.md) — CodeMirror packages reached only through React.lazy are not pre-bundled by Vite; add them to optimizeDeps.include to avoid empty-MIME errors on first navigation to the editor.