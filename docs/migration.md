---
layout: default
title: Migrating from 1.x
nav_order: 6
description: "Upgrade from Strikethroo 1.x to 2.x"
---

# Migrating from 1.x to 2.x

2.x replaces slash commands with Agent Skills. Your plans and tasks are **fully compatible** -- no changes needed.

## 1. Delete obsolete slash commands

Delete whichever directories exist for harnesses you used:

```bash
rm -rf ".claude/commands/tasks/" \
  ".gemini/commands/tasks/" \
  ".codex/prompts/tasks-*" \
  ".github/prompts/tasks-*.prompt.md" \
  ".cursor/commands/tasks/" \
  ".opencode/command/tasks/"
```

## 2. Delete obsolete config scripts

In 1.x and 2.x the workspace lived under `.ai/task-manager/`, so the scripts to remove are there:

```bash
rm -f .ai/task-manager/config/scripts/*.cjs
rmdir .ai/task-manager/config/scripts 2>/dev/null
```

## 3. Rename the workspace directory

3.x+ uses `.ai/strikethroo/` instead of `.ai/task-manager/`. Rename the directory so your existing plans, archive, and config carry over:

```bash
mv .ai/task-manager .ai/strikethroo
```

## 4. Re-initialize the workspace

```bash
npx strikethroo@latest init --harnesses claude
```

Replace `claude` with your harness(es), e.g. `claude,gemini,opencode`.

## 5. Install the workflow skills

```bash
npx skills add e0ipso/strikethroo
```

## What changed

| 1.x | 2.x |
|-----|-----|
| Slash commands (per-harness) | Agent Skills (harness-agnostic) |
| `.cjs` scripts in config | Bundled into skills |
| `claude-exec` CLI subcommand | Removed |

## What didn't change

- `.ai/strikethroo/plans/` and `archive/` are unchanged
- All plan and task markdown files work as-is
- Hooks and templates in `.ai/strikethroo/config/` are preserved
- `STRIKETHROO.md` project context is preserved
