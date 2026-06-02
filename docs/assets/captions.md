# Capture Asset Captions

One-line captions for every committed asset in `docs/assets/`, mapping each file
to the specific affordance it demonstrates. Produced by `npm run capture:web`
(see `src/capture/capture-web.ts`) against the committed fixture workspace at
`src/capture/fixtures/capture-workspace/` (plans 102–104) for repeatable output.
The `docs/web-app.md` page and the README consume these.

All captures use the light theme at a single 1440x900 desktop viewport.

## Still screenshots (PNG)

| File | Caption |
| --- | --- |
| `plans-board.png` | Plans home defaults to the Board view: plans flow across lifecycle columns (drafted, tasks ready, doing) with per-plan task-progress bars. |
| `plans-cards.png` | The Cards view of the same Plans home: each plan as a summary card with status pill, task-done count, and phase count. |
| `plan-detail-plan.png` | Plan Detail "Plan" tab: wide rendered-markdown reader with the execution-blueprint rail on the right. |
| `plan-detail-graph.png` | Plan Detail "Graph" tab renders the task dependency DAG as a real mermaid `<svg>`, not an image. Shown for a distinct, smaller-graph plan so the structure stays readable. |
| `plan-detail-tasks-swimlanes.png` | Tasks tab, Swimlanes view: phases as lanes; done task titles are struck through (never checkboxes) and carry a green `done` pill. |
| `task-detail.png` | Task Detail page: a done task title shown struck through, rendered through the same prose renderer as plan sections (Objective, Acceptance Criteria, etc.). |
| `task-detail-implementation-notes.png` | Task Detail "Implementation Notes" tab slices just the `## Implementation Notes` section out of the task body. |
| `archive-all.png` | Archive screen: completed plans grouped by month with aggregate stats (plans archived, tasks completed, phases run). |
| `customize-hooks.png` | Customize "Hooks" tab: a responsive card grid of the nine lifecycle hooks, each card deep-linking to its editor. |
| `customize-templates.png` | Customize "Templates" tab: the same card grid for the customizable plan/task/blueprint/summary templates. |
| `customize-detail-editor.png` | Customize detail: a mounted CodeMirror 6 markdown editor showing editable raw source with syntax highlighting and a Save control. |

## Interaction videos (webm)

| File | Caption |
| --- | --- |
| `nav-plans-to-task-detail.webm` | Navigating Plans → Plan Detail → Task Detail by following the clickable blueprint task rows. |
| `plan-detail-tab-switch.webm` | Switching Plan Detail tabs Plan → Graph (mermaid renders) → Tasks → Plan. |
| `plans-board-cards-switch.webm` | Toggling the Plans home between the Board and Cards views in place. |
| `customize-editor-save.webm` | Typing into the CodeMirror editor and triggering Save, with inline saving/saved feedback (workspace edit is restored afterward). |

## README preview

| File | Caption |
| --- | --- |
| `readme-preview.png` | Hi-res still preview for README embedding (2880x1800), a copy of the Plans Board — the most compelling single-frame "this is the web app" image. GIF tooling (palettegen/gif muxer) was unavailable in the bundled ffmpeg, so the README embeds this still and links to the full interaction `.webm` videos on the docs page. |
