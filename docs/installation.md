---
layout: default
title: Installation & Setup
nav_order: 2
parent: Getting Started
description: "Installing and configuring AI Task Manager"
---

# 📦 Installation & Setup

AI Task Manager initializes quickly with two commands: one to bootstrap the shared task-manager workspace in your project, and one to install the workflow skills for your assistant.

## Prerequisites

- **Node.js**: Version 14.0 or higher
- **npm**: Comes with Node.js
- **AI Assistant**: An assistant that supports the Agent Skills format

## Installation

No global installation required. Use `npx` to run both steps directly:

### Step 1: Bootstrap the Workspace

```bash
npx @e0ipso/ai-task-manager init --assistants claude
```

This creates the shared `.ai/task-manager/` directory (plans, archive, config) and copies the Claude agents into `.claude/agents/`.

### Step 2: Install the Workflow Skills

```bash
npx skills add e0ipso/ai-task-manager
```

This installs the Agent Skills that implement the workflow. Skills are the sole delivery channel for the task-manager workflow: they load automatically when their description matches your intent, and they are assistant-agnostic — a single skill works for every assistant that supports the Agent Skills format.

To pin a specific release:

```bash
npx skills add e0ipso/ai-task-manager@<tag>
```

## The `--assistants` Flag

The `--assistants` flag is **required** when running `init`. It controls which per-assistant artifacts the CLI copies in addition to the shared workspace.

Today, only Claude has per-assistant artifacts (agents under `.claude/agents/`). Non-Claude assistants get the shared workspace only and rely entirely on the installed skills:

```bash
# Claude (copies .ai/task-manager/ + .claude/agents/)
npx @e0ipso/ai-task-manager init --assistants claude

# Other assistants (copies .ai/task-manager/ only; rely on skills)
npx @e0ipso/ai-task-manager init --assistants gemini
```

You can pass multiple assistants in a single run:

```bash
npx @e0ipso/ai-task-manager init --assistants claude,gemini,opencode,codex,github,cursor
```

All assistants share the same task management structure (plans, tasks, configurations).

### Custom Destination Directory

By default, `init` writes into the current working directory. Use `--destination-directory` to target an alternative location:

```bash
npx @e0ipso/ai-task-manager init \
  --assistants claude \
  --destination-directory /path/to/project
```

## Directory Structure

After running both commands, the project layout looks like this:

```
project-root/
├── .ai/
│   └── task-manager/              # Shared configuration files
│       ├── plans/                 # Active plans (empty initially)
│       ├── archive/               # Completed plans (empty initially)
│       ├── config/
│       │   ├── TASK_MANAGER.md    # Project context (customize this!)
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
└── .claude/                       # Claude agents (if --assistants claude)
    └── agents/
        └── plan-creator.md
```

The installed skills live wherever your assistant manages them; they are not copied into the project tree.

## Updating Configuration

### Re-running init

Re-run the init command to update the workspace files to the latest version:

```bash
npx @e0ipso/ai-task-manager init --assistants claude
```

**File Conflict Detection** automatically:
- Compares current files to original versions using SHA-256 hashes
- Prompts if you've customized files (shows unified diff)
- Updates unchanged files automatically
- Preserves your customizations

### Force Mode

Bypass conflict detection prompts (useful for automation):

```bash
npx @e0ipso/ai-task-manager init --assistants claude --force
```

**Warning**: Force mode overwrites ALL files, including your customizations. Back up custom hooks and templates first!

### Updating Skills

Re-run `npx skills add e0ipso/ai-task-manager` to pull the latest skills. The two channels (CLI init and skills installer) are independently re-runnable.

## Verification

Verify successful installation:

### 1. Check Directory Structure

```bash
ls -la .ai/task-manager/
```

You should see: `plans/`, `archive/`, `config/`

### 2. Check Claude Agents (if you ran `--assistants claude`)

```bash
ls -la .claude/agents/
```

### 3. Test Status Command

```bash
npx @e0ipso/ai-task-manager status
```

Should show: "No active plans found" (until you create your first plan)

### 4. Confirm Skills Are Installed

Open your assistant and ask it to create a task-manager plan. The `task-create-plan` skill should load automatically based on intent.

## Customizing for Your Project

After installation, customize these files for your specific needs:

### Essential Customizations

1. **`.ai/task-manager/config/TASK_MANAGER.md`**
   - Add project context (tech stack, coding standards, architecture decisions)
   - Include links to design docs, API specs, or style guides
   - Document project-specific conventions

2. **`.ai/task-manager/config/hooks/POST_PHASE.md`**
   - Add your quality gates (linting, tests, coverage thresholds)
   - Include deployment steps (staging, production)
   - Add notification steps (Slack, email, dashboard updates)

### Advanced Customizations

See the [Customization Guide](customization.html) for:
- Template modifications
- Hook customization examples
- Real-world scenarios (React projects, API projects, monorepos)

## Next Steps

- **[Basic Workflow Guide](workflow.html)**: Learn the day-to-day development workflow
- **[How It Works](architecture.html)**: Understand the three-phase system
- **[Customization Guide](customization.html)**: Tailor AI Task Manager to your project

Ready to create your first plan? Simply ask your assistant to plan a feature — the installed skills will pick up the request, drop the plan into `.ai/task-manager/plans/`, and walk you through review, decomposition, and execution.
