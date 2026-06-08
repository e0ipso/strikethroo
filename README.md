# Strikethroo

[![npm version](https://img.shields.io/npm/v/strikethroo.svg)](https://www.npmjs.com/package/strikethroo)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Strikethroo is spec-driven development that fits each codebase like a glove. Plain-Markdown hooks teach the agent your conventions -- test commands, coding standards, domain rules -- so every plan, task, and run inherits them. No API keys, no extra tools: it works inside the AI subscription you already pay for, on any harness that supports the Agent Skills format.

## Why Strikethroo?

<table>
<tr>
<td width="50%" valign="top">

<img src="docs/assets/icons/sliders-horizontal.svg" width="28" height="28" alt="" />

### Bends to your conventions

Plain-Markdown hooks fire at nine points across the workflow; inject your test commands, standards, and domain rules so every plan, task, and run inherits them. No plugins, no code.

</td>
<td width="50%" valign="top">

<img src="docs/assets/icons/focus.svg" width="28" height="28" alt="" />

### Clean context per agent

Every step runs with a fresh, focused context: the planner sees only your work order, the task generator only the approved plan, each execution sub-agent only its single task. No context bleed, no drift.

</td>
</tr>
<tr>
<td width="50%" valign="top">

<img src="docs/assets/icons/scissors.svg" width="28" height="28" alt="" />

### YAGNI scope control

Anti-pattern enumeration, an "is this explicitly mentioned?" gate, and a 20--30% task-reduction target keep plans lean. Every task traces back to an explicit requirement.

</td>
<td width="50%" valign="top">

<img src="docs/assets/icons/key-round.svg" width="28" height="28" alt="" />

### No API keys

Runs inside the assistant you already use -- Claude Code, Codex, Cursor, OpenCode, or Copilot -- on the subscription you already pay for. Nothing to provision, host, or rotate.

</td>
</tr>
<tr>
<td width="50%" valign="top">

<img src="docs/assets/icons/puzzle.svg" width="28" height="28" alt="" />

### Harness-agnostic skills

The workflow ships as Agent Skills: one `SKILL.md` works on any harness supporting the format. Install once; the right skill auto-loads when you describe what you need.

</td>
<td width="50%" valign="top"></td>
</tr>
</table>

## Adapts to every codebase

Every codebase has its own conventions, and Strikethroo bends to them instead of imposing its own. Three plain-Markdown surfaces -- no plugins, no code:

[![Strikethroo's customizable spec-driven workflow, showing where the hooks fire: PRE_PLAN, POST_PLAN, POST_TASK_GENERATION_ALL, PRE_TASK_ASSIGNMENT, and POST_EXECUTION](docs/assets/strikethroo-customization.png)](docs/assets/strikethroo-customization.png)

### <img src="docs/assets/icons/waypoints.svg" width="28" height="28" alt="" /> Hooks

Fire at nine points across the workflow (before planning, after each phase, on errors, and more). Drop in your test commands, coding standards, and domain rules; every plan, task, and execution run inherits them.

### <img src="docs/assets/icons/file-text.svg" width="28" height="28" alt="" /> Templates

Define the shape of plans and tasks -- add your own sections and checklists.

### <img src="docs/assets/icons/book-open.svg" width="28" height="28" alt="" /> Project context

One file of domain knowledge every step reads.

Hooks, templates, and a project-context file are all plain Markdown -- nothing to compile, no plugin API to learn. See the [Customization Guide](https://mateuaguilo.com/strikethroo/customization.html) for examples.

## Quick Start

```bash
# 1. Bootstrap the shared workspace
npx strikethroo init --harnesses claude

# 2. Install the workflow skills
npx skills add e0ipso/strikethroo
```

Requires Node.js 22+ and an assistant that supports the Agent Skills format.

## In your coding assistant

```mermaid
flowchart LR
    A[Work Order] --> B[Plan]
    B --> C{Review}
    C -->|Edit| B
    C -->|Approve| D[Tasks]
    D --> E{Verify}
    E --> G[Execute]
    G --> H{Review}
    H -->|Edit| G
    H -->|Approve| J[Done]
```

Three steps, each delivered as an Agent Skill that loads when you describe what you need:

| Step        | Skill                           | Output                                            |
|-------------|---------------------------------|---------------------------------------------------|
| **Plan**    | `/st-create-plan <your prompt>` | `.ai/strikethroo/plans/64--auth/plan-64--auth.md` |
| **Tasks**   | `/st-generate-tasks 64`         | `.ai/strikethroo/plans/64--auth/tasks/*.md`       |
| **Execute** | `/st-execute-blueprint 64`      | Working code, one commit per phase                |

Human review gates between steps catch scope creep before any code is written. Each step runs with clean context -- the planning agent sees only the work order, the task agent sees only the approved plan, and each execution sub-agent receives only its specific task.

See the [Workflow Guide](https://mateuaguilo.com/strikethroo/workflow.html) for the full step-by-step with advanced patterns. Once a plan exists, visualize its plans, tasks, and dependency graph in [Visualizations](https://mateuaguilo.com/strikethroo/visualizations.html).

## Visualize the data
Strikethroo comes with an optional **web application** to help you visualize your plans, tasks, and progress. No installation necessary, just execute the following command in a project using Strikethroo:

```shell
npx strikethroo serve
```

This will open a web page that will help you navigate your plans and their tasks, present or archived.

| Plans board                                                 | Plan detail page                                                                                                       | Archive                                                     |
|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| [![img](docs/assets/plans-board.png)](docs/assets/plans-board.png) | [![img](docs/assets/plan-detail-graph.png)](docs/assets/plan-detail-graph.png) | [![img](docs/assets/archive-all.png)](docs/assets/archive-all.png) |

## Documentation

- [Workflow Guide](https://mateuaguilo.com/strikethroo/workflow.html) -- Step-by-step workflow with visual guides
- [Customization Guide](https://mateuaguilo.com/strikethroo/customization.html) -- Hooks, templates, and project context
- [Reference](https://mateuaguilo.com/strikethroo/reference.html) -- Glossary and CLI reference
- [FAQ](https://mateuaguilo.com/strikethroo/faq.html) -- Answers to common questions
- [Visualizations](https://mateuaguilo.com/strikethroo/visualizations.html) -- See plans, tasks, and the dependency graph
- [Migrating from 1.x](https://mateuaguilo.com/strikethroo/migration.html) -- Upgrade from slash commands to Agent Skills
