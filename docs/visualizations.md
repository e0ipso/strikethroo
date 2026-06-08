---
layout: default
title: Visualizations
nav_order: 6
description: "See your plans, tasks, dependency graph, and archive in a live, read-only web app"
---

# Visualizations

Strikethroo stores everything as Markdown. To *see* where your work stands, run the read-only web app from any initialized project:

```bash
npx strikethroo serve
```

It opens your browser and live-updates over SSE as the files change.

{% include callout.html variant="tip" content="No build step, no database, no manual reload. `serve` reads your `.ai/strikethroo/` workspace directly and streams changes as they happen on disk." %}

## Plans

Every plan and its progress, at a glance.

[![Plans home, Board view]({{ '/assets/plans-board.png' | relative_url }})]({{ '/assets/plans-board.png' | relative_url }})

Switch between the pipeline **Board** and detail **Cards** in place:

<video class="wide-video" controls preload="metadata" src="{{ '/assets/plans-board-cards-switch.webm' | relative_url }}"></video>

## A single plan

Read the plan document, with the task blueprint pinned alongside.

[![Plan Detail, Plan tab]({{ '/assets/plan-detail-plan.png' | relative_url }})]({{ '/assets/plan-detail-plan.png' | relative_url }})

See the task **dependency graph** -- a live mermaid render, not a baked image.

[![Plan Detail, Graph tab]({{ '/assets/plan-detail-graph.png' | relative_url }})]({{ '/assets/plan-detail-graph.png' | relative_url }})

Flip between the **Plan**, **Graph**, and **Tasks** (swimlanes) tabs:

<video class="wide-video" controls preload="metadata" src="{{ '/assets/plan-detail-tab-switch.webm' | relative_url }}"></video>

## Tasks

Open any task for its objective, acceptance criteria, and dependencies.

[![Task Detail]({{ '/assets/task-detail.png' | relative_url }})]({{ '/assets/task-detail.png' | relative_url }})

Trace a path from the Plans board down to a single task:

<video class="wide-video" controls preload="metadata" src="{{ '/assets/nav-plans-to-task-detail.webm' | relative_url }}"></video>

## Archive

Browse finished plans, grouped by month with running totals -- what you shipped, and how much.

[![Archive]({{ '/assets/archive-all.png' | relative_url }})]({{ '/assets/archive-all.png' | relative_url }})

## Customize

Discover every lifecycle hook and template the workspace ships with.

| Hooks                                                                                                                       | Templates                                                                                                                             |
|-----------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| [![Customize, Hooks tab]({{ '/assets/customize-hooks.png' \| relative_url }})]({{ '/assets/customize-hooks.png' \| relative_url }}) | [![Customize, Templates tab]({{ '/assets/customize-templates.png' \| relative_url }})]({{ '/assets/customize-templates.png' \| relative_url }}) |

Then edit one in place, with instant feedback -- one of only two writes the app ever makes to disk:

<video class="wide-video" controls preload="metadata" src="{{ '/assets/customize-editor-save.webm' | relative_url }}"></video>
