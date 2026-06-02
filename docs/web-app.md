---
layout: default
title: The Web App
nav_order: 7
description: "Visualize your plans, tasks, and archive through the read-only web app"
---

# The Web App

Strikethroo writes everything to plain Markdown files under `.ai/strikethroo/`. That is great for version control and for the assistant, but a tree of `.md` files is a poor way for a *human* to see where a plan stands. The web app is the missing half: a read-only window that turns those files into a navigable, live-updating picture of your work.

Run it from any initialized project:

```bash
npx strikethroo serve
```

It scans the workspace, opens your browser, and streams changes over SSE -- no build step, no database, no manual reload.

## The Other Half of the Story

Strikethroo has two halves, and most of the documentation so far has only shown one.

**The authoring half lives in the harness.** You talk to your assistant -- Claude Code, Gemini CLI, opencode, or the desktop app -- in plain language. The `st-*` skills load automatically and the assistant *writes the files*: plan documents, task files, and the execution blueprint, all as Markdown inside `.ai/strikethroo/`. That conversation is where intent becomes a plan. We deliberately do not screenshot it here: the terminal flow is already covered in the [Workflow Guide](workflow.html), and it is not what this page is about.

**The visualization half lives in the web app.** Once those files exist, you need to *see* them -- which plans are drafted, which are mid-execution, which tasks are done, how tasks depend on one another. The web app never authors anything (with two narrow, guarded exceptions: archiving a finished plan and saving a config-file edit). It is a read-only lens over the same files the assistant just wrote. Edit a file in the harness and the web app reflects it instantly; the two halves stay in sync because they share one source of truth: the files on disk.

Everything below is that lens. Each screen exists to answer a question you would otherwise have to grep for. A persistent shell -- the sidebar (Plans, Archive, Customize) and header chrome visible in every screenshot below -- keeps those three top-level concerns one click away.

## Plans Home

The Plans home is where you land. It answers the first question you ever have: *what is in flight, and how far along is it?*

### Board view

![Plans home, Board view]({{ '/assets/plans-board.png' | relative_url }})

*The default Board view flows plans across lifecycle columns -- drafted, tasks ready, doing -- with a per-plan progress bar. This is the "where does everything stand" view: lifecycle state is derived from the files, not tracked separately, so the board can never drift out of sync with reality.*

### Cards view

![Plans home, Cards view]({{ '/assets/plans-cards.png' | relative_url }})

*The same plans as summary cards -- status pill, task-done count, phase count. Switch in place when you care about per-plan detail more than pipeline flow.*

You can toggle between the two without leaving the page:

<video controls src="{{ '/assets/plans-board-cards-switch.webm' | relative_url }}"></video>

## Plan Detail

Click a plan to open its detail screen. This is where a single plan's full story lives, split across three tabs: **Plan**, **Graph**, and **Tasks**.

### Plan tab

![Plan Detail, Plan tab]({{ '/assets/plan-detail-plan.png' | relative_url }})

*A wide rendered-Markdown reader for the plan document itself, with the execution-blueprint rail pinned to the right. You read the narrative -- objective, approach, risks, success criteria -- while keeping the task list in peripheral view.*

### Graph tab

![Plan Detail, Graph tab]({{ '/assets/plan-detail-graph.png' | relative_url }})

*The task dependency DAG, rendered as a real mermaid `<svg>` -- not a baked image. This is the view that makes parallelism legible: you can see at a glance which tasks gate which, and which phases can run at once. (Shown here for a plan with a smaller graph, so the structure stays readable.) A dependency graph is hard to hold in your head from reading task frontmatter; here it is just a picture.*

### Tasks tab

The Tasks tab renders the execution blueprint as swimlanes:

![Tasks tab, Swimlanes view]({{ '/assets/plan-detail-tasks-swimlanes.png' | relative_url }})

*Swimlanes view: each phase is a lane, so you read execution order top-to-bottom and parallelism left-to-right. (An Outline view toggles the same tasks into compact, phase-grouped rows for a denser scan when a plan has many tasks.)*

Switching between all three Plan Detail tabs is instant:

<video controls src="{{ '/assets/plan-detail-tab-switch.webm' | relative_url }}"></video>

> **The strikethrough is the whole point.** A done task is shown with its title *struck through* -- never as a checkbox. That is not a styling accident: it is the product's namesake. "Strikethroo" is what finished work looks like. The blueprint task rows are read-only, so there is no checkbox to toggle; completion is a fact derived from the file's status, and the app simply draws a line through what is done. You see progress the way you would cross items off a paper list.
{: .highlight }

## Task Detail

Click any task row -- in the blueprint rail or either Tasks view -- to open the task itself.

![Task Detail]({{ '/assets/task-detail.png' | relative_url }})

*A done task title, struck through, with the task body (Objective, Acceptance Criteria, and the rest) rendered through the exact same prose renderer as plan sections. The point: a task is a first-class document, not a checkbox in a list. You can read its acceptance criteria and dependencies without leaving the app.*

![Task Detail, Implementation Notes tab]({{ '/assets/task-detail-implementation-notes.png' | relative_url }})

*The Implementation Notes tab slices just the `## Implementation Notes` section out of the task body, so detailed execution guidance is one click away but never clutters the main read.*

Following the clickable rows from Plans all the way down to a single task is a continuous flow:

<video controls src="{{ '/assets/nav-plans-to-task-detail.webm' | relative_url }}"></video>

## Archive

Finished plans move to the Archive -- the historical record of everything you have shipped.

![Archive]({{ '/assets/archive-all.png' | relative_url }})

*Completed plans grouped by completion month, with aggregate stats: plans archived, tasks completed, phases run. This is the "what did we get done" view, and the running totals turn a pile of finished plans into a sense of velocity. A created-date range filter and column sorting (not shown) narrow the list live -- useful for "what shipped this quarter" without scrolling through everything.*

## Customize

The Customize section surfaces the workspace's hooks and templates -- the files that adapt Strikethroo to your project -- and lets you edit them in place.

![Customize, Hooks tab]({{ '/assets/customize-hooks.png' | relative_url }})

*A responsive card grid of the nine lifecycle hooks, each deep-linking to its editor. Hooks are where you inject project-specific intelligence at known points of the workflow; this grid makes the full set discoverable instead of buried in a config directory.*

![Customize, Templates tab]({{ '/assets/customize-templates.png' | relative_url }})

*The same grid for the customizable plan, task, blueprint, and summary templates -- the structures every generated artifact is poured into.*

![Customize detail, the editor]({{ '/assets/customize-detail-editor.png' | relative_url }})

*Opening a card mounts a CodeMirror 6 Markdown editor: editable raw source with syntax highlighting and a Save control. This is one of only two places the web app writes back to disk -- a deliberate, guarded escape hatch for tweaking a hook or template without switching tools.*

Editing and saving gives immediate inline feedback:

<video controls src="{{ '/assets/customize-editor-save.webm' | relative_url }}"></video>

## Live, Without Reloading

Because the app is a lens over the files, anything that changes the files changes the view -- automatically. Add or remove a plan in the harness and the Plans list updates over SSE, with no manual refresh.

This is why the two halves work together. The assistant authors in the harness; you watch it take shape, in real time, in the web app.
