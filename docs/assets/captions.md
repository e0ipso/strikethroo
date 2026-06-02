# Capture Asset Captions

One-line captions for every committed asset in `docs/assets/`, mapping each file
to the specific affordance it demonstrates. Produced by `npm run capture:web`
(see `src/capture/capture-web.ts`) against this repo's own `.ai/strikethroo/`
workspace. Tasks 003 (docs visualization page) and 004 (README) consume these.

All captures use the light theme at a single 1440x900 desktop viewport.

## Still screenshots (PNG)

| File | Caption |
| --- | --- |
| `plans-board.png` | Plans home defaults to the Board view: plans flow across lifecycle columns (drafted, tasks ready, doing) with per-plan task-progress bars. |
| `plans-cards.png` | The Cards view of the same Plans home: each plan as a summary card with status pill, task-done count, and phase count. |
| `app-shell.png` | The persistent app shell — sidebar (Plans, Archive, Customize) plus header chrome — that frames every screen. |
| `plan-detail-plan.png` | Plan Detail "Plan" tab: wide rendered-markdown reader with the execution-blueprint rail on the right. |
| `plan-detail-graph.png` | Plan Detail "Graph" tab renders the task dependency DAG as a real mermaid `<svg>`, not an image. |
| `plan-detail-tasks-swimlanes.png` | Tasks tab, Swimlanes view: phases as lanes; done task titles are struck through (never checkboxes) and carry a green `done` pill. |
| `plan-detail-tasks-outline.png` | Tasks tab, Outline view: compact phase-grouped rows where done tasks are struck through with a `done` status pill. |
| `task-detail.png` | Task Detail page: a done task title shown struck through, rendered through the same prose renderer as plan sections (Objective, Acceptance Criteria, etc.). |
| `task-detail-implementation-notes.png` | Task Detail "Implementation Notes" tab slices just the `## Implementation Notes` section out of the task body. |
| `archive-all.png` | Archive screen: completed plans grouped by month with aggregate stats (plans archived, tasks completed, phases run). |
| `archive-by-month.png` | Archive By-month grouping: rows collected under completion-month headings. |
| `archive-date-range.png` | Archive date-range filter engaged (2000 → 2999): the result bar and counts reflect the filtered set. |
| `customize-hooks.png` | Customize "Hooks" tab: a responsive card grid of the nine lifecycle hooks, each card deep-linking to its editor. |
| `customize-templates.png` | Customize "Templates" tab: the same card grid for the customizable plan/task/blueprint/summary templates. |
| `customize-detail-editor.png` | Customize detail: a mounted CodeMirror 6 markdown editor showing editable raw source with syntax highlighting and a Save control. |

## Interaction videos (webm)

| File | Caption |
| --- | --- |
| `nav-plans-to-task-detail.webm` | Navigating Plans → Plan Detail → Task Detail by following the clickable blueprint task rows. |
| `plan-detail-tab-switch.webm` | Switching Plan Detail tabs Plan → Graph (mermaid renders) → Tasks → Plan. |
| `plans-board-cards-switch.webm` | Toggling the Plans home between the Board and Cards views in place. |
| `archive-sort-and-filter.webm` | Toggling the Archive sort direction and applying the created-date range filter, regrouping the result set live. |
| `customize-editor-save.webm` | Typing into the CodeMirror editor and triggering Save, with inline saving/saved feedback (workspace edit is restored afterward). |
| `live-update-sse.webm` | A workspace change (a plan added then removed) reflected live in the Plans list over SSE, with no manual reload. |

## README fallback

| File | Caption |
| --- | --- |
| `readme-preview.png` | Hi-res still preview for README embedding (2880x1800), the Plan Detail dependency graph — the most compelling single-frame "this is the web app" image. GIF tooling (palettegen/gif muxer) was unavailable in the bundled ffmpeg, so the README embeds this still and links to the full interaction `.webm` videos on the docs page. |
