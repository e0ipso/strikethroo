---
layout: default
title: Migrating from 1.x
nav_order: 3
parent: Getting Started
description: "Upgrade from AI Task Manager 1.x to 2.x"
---

# Migrating from 1.x to 2.x

2.x replaces slash commands with Agent Skills. Your plans and tasks are **fully compatible** — no changes needed.

## 1. Delete obsolete slash commands

Delete whichever directories exist for harnesses you used:

```bash
# Claude
rm -rf .claude/commands/tasks/

# Gemini
rm -rf .gemini/commands/tasks/

# Codex
rm -f .codex/prompts/tasks-*

# GitHub Copilot
rm -f .github/prompts/tasks-*.prompt.md

# Cursor
rm -rf .cursor/commands/tasks/

# Open Code
rm -rf .opencode/command/tasks/
```

## 2. Delete obsolete config scripts

```bash
rm -f .ai/task-manager/config/scripts/*.cjs
rmdir .ai/task-manager/config/scripts 2>/dev/null
```

## 3. Re-initialize the workspace

```bash
npx @e0ipso/ai-task-manager@latest init --harnesses claude
```

Replace `claude` with your harness(es), e.g. `claude,gemini,opencode`.

## 4. Install the workflow skills

```bash
npx skills add e0ipso/ai-task-manager
```

## What changed

| 1.x | 2.x |
|-----|-----|
| Slash commands (per-harness) | Agent Skills (harness-agnostic) |
| `.cjs` scripts in config | Bundled into skills |
| `claude-exec` CLI subcommand | Removed |

## What didn't change

- `.ai/task-manager/plans/` and `archive/` are unchanged
- All plan and task markdown files work as-is
- Hooks and templates in `.ai/task-manager/config/` are preserved
- `TASK_MANAGER.md` project context is preserved
