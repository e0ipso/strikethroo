---
layout: default
title: Getting Started
nav_order: 2
description: "Install Strikethroo and run your first workflow"
---

# Getting Started

Get up and running with Strikethroo quickly. This page covers prerequisites, installation, directory structure, your first workflow, and verification.

Strikethroo transforms complex development requests into organized, executable workflows through a three-step workflow:

1. **Create Plan** -- Define objectives and clarify requirements
2. **Generate Tasks** -- Break the plan into atomic tasks with dependencies
3. **Execute Blueprint** -- Implement tasks with review gates and quality gates

The workflow is delivered through harness-agnostic Agent Skills installed via `npx skills add e0ipso/strikethroo`. Skills load automatically when their description matches your intent, so you drive the workflow by asking your assistant to plan, decompose, or execute -- no commands to memorize.

## Prerequisites

- **Node.js**: Version 14.0 or higher
- **npm**: Comes with Node.js
- **AI Harness**: A harness that supports the Agent Skills format (Claude, Gemini, OpenCode, Codex, GitHub, Cursor, etc.)

## Installation

No global installation required. Use `npx` to run both steps directly.

### Step 1: Bootstrap the Workspace

```bash
npx strikethroo init --harnesses claude
```

This creates the shared `.ai/strikethroo/` directory (plans, archive, config) and copies the Claude agents into `.claude/agents/`.

### Step 2: Install the Workflow Skills

```bash
npx skills add e0ipso/strikethroo
```

This installs the Agent Skills that implement the three-step workflow. Skills are harness-agnostic -- a single skill works for every harness that supports the Agent Skills format.

To pin a specific release:

```bash
npx skills add e0ipso/strikethroo@<tag>
```

### The `--harnesses` Flag

The `--harnesses` flag is **required** when running `init`. It controls which per-harness artifacts the CLI copies in addition to the shared workspace.

Each harness can have its own agent files deployed to the appropriate location (e.g., `.claude/agents/` for Claude). Harnesses without harness-specific agents get the shared workspace only and rely entirely on the installed skills:

```bash
# Claude (copies .ai/strikethroo/ + .claude/agents/)
npx strikethroo init --harnesses claude

# Other harnesses (copies .ai/strikethroo/ only; rely on skills)
npx strikethroo init --harnesses gemini
```

You can pass multiple harnesses in a single run:

```bash
npx strikethroo init --harnesses claude,gemini,opencode,codex,github,cursor
```

All harnesses share the same task management structure (plans, tasks, configurations).

### Custom Destination Directory

By default, `init` writes into the current working directory. Use `--destination-directory` to target an alternative location:

```bash
npx strikethroo init \
  --harnesses claude \
  --destination-directory /path/to/project
```

## Directory Structure

After running both commands, the project layout looks like this:

```
project-root/
├── .ai/
│   └── strikethroo/               # Shared configuration files
│       ├── plans/                 # Active plans (empty initially)
│       ├── archive/               # Completed plans (empty initially)
│       ├── config/
│       │   ├── STRIKETHROO.md     # Project context (customize this!)
│       │   ├── hooks/             # Lifecycle hooks
│       │   │   ├── PRE_PLAN.md
│       │   │   ├── PRE_PHASE.md
│       │   │   ├── POST_PHASE.md
│       │   │   ├── POST_PLAN.md
│       │   │   ├── POST_TASK_GENERATION_ALL.md
│       │   │   ├── PRE_TASK_ASSIGNMENT.md
│       │   │   ├── PRE_TASK_EXECUTION.md
│       │   │   ├── POST_ERROR_DETECTION.md
│       │   │   └── POST_EXECUTION.md
│       │   ├── templates/         # Customizable templates
│       │   │   ├── PLAN_TEMPLATE.md
│       │   │   ├── TASK_TEMPLATE.md
│       │   │   ├── BLUEPRINT_TEMPLATE.md
│       │   │   └── EXECUTION_SUMMARY_TEMPLATE.md
│       └── .init-metadata.json    # File conflict detection tracking
└── .claude/                       # Claude agents (if --harnesses claude)
    └── agents/
        └── plan-creator.md
```

The installed skills live wherever your assistant manages them; they are not copied into the project tree.

## Your First Workflow

Once installation is complete, you drive the three-step workflow entirely through your assistant. Here is the typical sequence:

1. **Create a plan** -- Ask your assistant to plan a feature or change. The `st-create-plan` skill loads automatically, gathers requirements, and produces a work order in `.ai/strikethroo/plans/`.

2. **Generate tasks** -- Ask your assistant to decompose the plan into tasks. The `st-generate-tasks` skill breaks the plan into atomic tasks with dependency mapping and writes them into the plan's `tasks/` subdirectory.

3. **Execute the blueprint** -- Ask your assistant to execute the plan. The `st-execute-blueprint` skill works through each phase, running tasks in dependency order with quality gates between phases.

You can also run all three steps in a single uninterrupted sequence by asking your assistant to handle the full workflow end-to-end (the `st-full-workflow` skill).

For a detailed walkthrough of the day-to-day development cycle, see the [Workflow Guide](workflow.html).

## Verification

Verify successful installation:

### 1. Check Directory Structure

```bash
ls -la .ai/strikethroo/
```

You should see: `plans/`, `archive/`, `config/`

### 2. Check Claude Agents (if you ran `--harnesses claude`)

```bash
ls -la .claude/agents/
```

### 3. Inspect Plans on Disk

Plans live under `.ai/strikethroo/plans/` and completed plans are moved to `.ai/strikethroo/archive/` automatically by the `st-execute-blueprint` skill. Until you create your first plan, `plans/` is empty:

```bash
ls -la .ai/strikethroo/plans/
```

### 4. Confirm Skills Are Installed

Open your assistant and ask it to create a Strikethroo plan. The `st-create-plan` skill should load automatically based on intent.

## Updating

### Re-running init

Re-run the init command to update the workspace files to the latest version:

```bash
npx strikethroo init --harnesses claude
```

**File Conflict Detection** automatically:
- Compares current files to original versions using SHA-256 hashes
- Prompts if you have customized files (shows unified diff)
- Updates unchanged files automatically
- Preserves your customizations

### Force Mode

Bypass conflict detection prompts (useful for automation):

```bash
npx strikethroo init --harnesses claude --force
```

**Warning**: Force mode overwrites ALL files, including your customizations. Back up custom hooks and templates first.

### Updating Skills

Re-run `npx skills add e0ipso/strikethroo` to pull the latest skills. The two channels (CLI init and skills installer) are independently re-runnable.

## Customizing for Your Project

After installation, customize these files for your specific needs:

### Essential Customizations

1. **`.ai/strikethroo/config/STRIKETHROO.md`**
   - Add project context (tech stack, coding standards, architecture decisions)
   - Include links to design docs, API specs, or style guides
   - Document project-specific conventions

2. **`.ai/strikethroo/config/hooks/POST_PHASE.md`**
   - Add your quality gates (linting, tests, coverage thresholds)
   - Include deployment steps (staging, production)
   - Add notification steps (Slack, email, dashboard updates)

### Advanced Customizations

See the [Customization Guide](customization.html) for:
- Template modifications
- Hook customization examples
- Real-world scenarios (React projects, API projects, monorepos)

## Next Steps

- **[Workflow Guide](workflow.html)**: Step-by-step workflow with visual guides
- **[Customization Guide](customization.html)**: Tailor hooks, templates, and project context
- **[Reference](reference.html)**: Glossary, CLI reference, FAQ
- **[Migrating from 1.x](migration.html)**: Upgrade from slash commands to Agent Skills
