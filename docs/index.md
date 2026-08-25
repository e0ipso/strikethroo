---
layout: default
title: Home
nav_order: 1
description: "Structured AI task management with plain text files and Agent Skills"
---

<p align="center">
  <img src="{{ '/assets/strikethroo-hero.png' | relative_url }}" alt="Strikethroo: complex programming requests become atomic, validated tasks through staged, spec-driven refinement" width="100%">
</p>

# Strikethroo

Strikethroo is spec-driven development optimized for **time-to-merge, not time-to-first-draft**. You review the plan, where a correction costs a sentence -- not the diff, where the same correction costs a review cycle. It works inside the AI subscription you already pay for, on any harness that supports the Agent Skills format.

## Why Strikethroo?

Most spec-driven tools optimize the input: better spec in, better code out, human catches the rest at the end. Strikethroo assumes the agent is an unreliable narrator of its own work -- including a second agent asked to review the first -- and that the scarce resource is your attention, not tokens.

<div class="st-cards" markdown="0">
<div class="st-card">
<span class="st-card__icon st-card__icon--focus" aria-hidden="true"></span>
<p class="st-card__title">You review the plan, not the diff</p>
<p>Correcting a plan costs a sentence. Correcting the same misunderstanding in a diff costs a review cycle, a rework cycle, and a re-review. An explicit approval gate puts your careful read where it is worth the most, and one question is asked at a time so it never gets skim-answered.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--shield-check" aria-hidden="true"></span>
<p class="st-card__title">Guarantees are compiled, not requested</p>
<p>A rule in Markdown is a request; a rule in TypeScript is a guarantee. Hooks and templates are yours to edit. The rule that an uncertified review is never reported as a clean one is compiled, and no edit to a hook can loosen it.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--git-fork" aria-hidden="true"></span>
<p class="st-card__title">Nobody marks their own homework</p>
<p>The optional review gate runs on a <em>different</em> harness than the one that wrote the code &mdash; the current harness is structurally excluded from the candidate set, not merely deprioritized. The reviewer detects and never fixes; its findings are recorded for you to judge.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--sliders-horizontal" aria-hidden="true"></span>
<p class="st-card__title">Bends to your conventions</p>
<p>Plain-Markdown hooks fire at eleven points across the workflow &mdash; inject your test commands, standards, and domain rules so every plan, task, and run inherits them. No plugins, no code.</p>
</div>
</div>

**Speed, measured honestly.** The industry clock starts at the prompt and stops when code appears. The clock that pays your salary stops when the code is **merged** -- and on that clock, generation is a rounding error next to the review rounds a fast-but-wrong draft costs you. Strikethroo is built against the second clock. That is not quality traded for speed; on that clock they are the same number.

Read the full thesis, with the file-by-file claims to verify it yourself: **[Why Strikethroo](why.html)**.

{% include callout.html variant="note" content="Also true, and less interesting: no API keys (runs on the subscription you already pay for), harness-agnostic Agent Skills (one `SKILL.md` on any harness supporting the format), and clean per-agent context at every step." %}

## Adapts to every codebase

Every codebase has its own conventions, and Strikethroo bends to them instead of imposing its own. Three plain-Markdown surfaces -- no plugins, no code:

![Strikethroo's customizable spec-driven workflow, showing where the hooks fire: PRE_PLAN, POST_PLAN, POST_TASK_GENERATION_ALL, PRE_TASK_ASSIGNMENT, and POST_EXECUTION]({{ '/assets/strikethroo-customization.png' | relative_url }})

- **Hooks** fire at eleven points across the workflow (before planning, after each phase, on errors, and more). Drop in your test commands, coding standards, and domain rules; every plan, task, and execution run inherits them.
- **Templates** define the shape of plans and tasks -- add your own sections and checklists.
- **Project context** is one file of domain knowledge every step reads.

{% include callout.html variant="tip" content="Hooks, templates, and a project-context file are all plain Markdown. Nothing to compile, no plugin API to learn. See the [Customization Guide](customization.html)." %}

## Quick Start

<div class="st-cards" markdown="0">
<div class="st-card">
<span class="st-card__icon st-card__icon--package" aria-hidden="true"></span>
<p class="st-card__title">Bootstrap the workspace</p>
<p>One command creates the shared <code>.ai/strikethroo/</code> workspace, copies the harness agents, and installs the workflow skills into each harness's skills directory.</p>
<pre class="highlight"><code>npx strikethroo init --harnesses claude</code></pre>
</div>
</div>

{% include callout.html variant="prereq" content="Requires [Node.js](https://nodejs.org) 22+ and an assistant that supports the Agent Skills format." %}

## In your coding assistant

```mermaid
flowchart LR
    A[Work Order] --> B[Plan]
    B --> C{Review}
    C -->|Edit| B
    C -->|Approve| G["Execute<br/>(generates tasks)"]
    G --> H["Code Review<br/>(optional)"]
    H -->|Fix| G
    H -->|Pass| J[Done]
```

**Two commands.** Read the plan, approve it, run it:

| Step        | Command                         | Output                                                  |
|-------------|---------------------------------|---------------------------------------------------------|
| **Plan**    | `/st-create-plan <your prompt>` | `.ai/strikethroo/plans/64--auth/plan-64--auth.md`       |
| **Execute** | `/st-execute-blueprint 64`      | Task blueprint, then working code, one commit per phase |
| **Review**  | Automatic (optional)            | Findings validated against schema; bounded fixes        |

`st-execute-blueprint` decomposes the plan into atomic tasks and builds the dependency-mapped blueprint itself when one does not exist yet. Run `/st-generate-tasks 64` on its own only when you want to inspect or hand-tune the blueprint before execution starts.

{% capture context_note %}
Your review lands on the plan, before any code exists &mdash; that is where a correction costs a sentence. Each step runs with clean context: the planning agent sees only the work order, and each execution sub-agent receives only its specific task. After execution, an optional automated review gate runs on a discovered second harness, critiques the cumulative diff, and records its findings for you to act on.
{% endcapture %}
{% include callout.html variant="note" title="WHY THE GATES MATTER" content=context_note %}

See the [Workflow Guide](workflow.html) for the full step-by-step with advanced patterns. Once a plan exists, visualize its plans, tasks, and dependency graph in [Visualizations](visualizations.html).

## Visualize the data

Strikethroo comes with an optional **web application** to help you visualize your plans, tasks, and progress. No installation necessary, just execute the following command in a project using Strikethroo:

```shell
npx strikethroo serve
```

This will open a web page that will help you navigate your plans and their tasks, present or archived.

| Plans board                                                 | Plan detail page                                                                                                       | Archive                                                     |
|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| [![img]({{ '/assets/plans-board.png' \| relative_url }})]({{ '/assets/plans-board.png' \| relative_url }}) | [![img]({{ '/assets/plan-detail-graph.png' \| relative_url }})]({{ '/assets/plan-detail-graph.png' \| relative_url }}) | [![img]({{ '/assets/archive-all.png' \| relative_url }})]({{ '/assets/archive-all.png' \| relative_url }}) |

## Documentation

<div class="st-cards" markdown="0">
<a class="st-card" href="{{ '/why.html' | relative_url }}">
<span class="st-card__icon st-card__icon--shield-check" aria-hidden="true"></span>
<p class="st-card__title">Why Strikethroo</p>
<p>The design thesis, the trade-offs stated plainly, and how to verify the claims.</p>
</a>
<a class="st-card" href="{{ '/workflow.html' | relative_url }}">
<span class="st-card__icon st-card__icon--workflow" aria-hidden="true"></span>
<p class="st-card__title">Workflow Guide</p>
<p>Step-by-step workflow with visual guides and advanced patterns.</p>
</a>
<a class="st-card" href="{{ '/customization.html' | relative_url }}">
<span class="st-card__icon st-card__icon--sliders-horizontal" aria-hidden="true"></span>
<p class="st-card__title">Customization Guide</p>
<p>Hooks, templates, and project context to shape the workflow.</p>
</a>
<a class="st-card" href="{{ '/reference.html' | relative_url }}">
<span class="st-card__icon st-card__icon--book-open" aria-hidden="true"></span>
<p class="st-card__title">Reference</p>
<p>Glossary and full CLI reference.</p>
</a>
<a class="st-card" href="{{ '/faq.html' | relative_url }}">
<span class="st-card__icon st-card__icon--circle-help" aria-hidden="true"></span>
<p class="st-card__title">FAQ</p>
<p>Answers to common questions.</p>
</a>
<a class="st-card" href="{{ '/visualizations.html' | relative_url }}">
<span class="st-card__icon st-card__icon--network" aria-hidden="true"></span>
<p class="st-card__title">Visualizations</p>
<p>See plans, tasks, and the dependency graph.</p>
</a>
<a class="st-card" href="{{ '/migration.html' | relative_url }}">
<span class="st-card__icon st-card__icon--circle-arrow-up" aria-hidden="true"></span>
<p class="st-card__title">Migration guides</p>
<p>Upgrade from slash commands to Agent Skills, and from the standalone skills installer to <code>init</code>.</p>
</a>
</div>
