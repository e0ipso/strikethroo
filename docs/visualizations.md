---
layout: default
title: Visualizations
nav_order: 7
description: "See your plans, tasks, dependency graph, and archive in a live local web app"
---

# Visualizations

Strikethroo stores everything as Markdown. To *see* where your work stands, run the local web app from any initialized project:

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

## Supported markup

Plan and task documents are Markdown, and the reader renders them through a fixed allowlist rather than trusting what the file contains.

- **Rendered:** headings, paragraphs, lists and task lists, emphasis, code and code blocks, blockquotes, rules, tables (with column alignment), `<details>`/`<summary>`, links, images, strikethrough, superscript and subscript, and `<kbd>`. Task-list checkboxes show as strikethrough for done items.
- **Removed:** forms and form controls (`form`, `input`, `button`, `select`, `textarea`), `iframe`, `object`, `embed`, `video`, `audio`, `link`, `meta`, `base`, inline `svg` and `math`, `style` attributes, event handlers, and author-set `id` and `class` attributes. The text inside a removed element stays; scripts and styles are dropped entirely.
- **Links:** `http:`, `https:`, `mailto:`, same-page `#fragment`, and relative paths. Other schemes, such as `javascript:`, are removed and the link text stays. External links open in a new tab without access to the viewer.
- **Images:** relative paths and small embedded `data:` images (PNG, GIF, JPEG, WebP, up to 100 KiB). An image from another site is not loaded; the viewer shows its alt text, or a plain link when there is none.
- **Diagrams:** Mermaid blocks render with strict security, and a diagram cannot change that, its theme, its fonts, or its size limits from inside its own `%%{init}%%` directive or front matter. Very large diagrams (over 50,000 characters or 500 edges) are refused.

The viewer also sends a Content Security Policy that only allows its own scripts, fonts, and styles, plus `data:` images, and forbids framing.

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
