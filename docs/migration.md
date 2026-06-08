---
layout: default
title: Migrating from AI Task Manager
nav_order: 7
description: "Upgrade from AI Task Manager to Strikethroo"
---

# Upgrade from AI Task Manager to Strikethroo

2.x replaces slash commands with Agent Skills.

{% include callout.html variant="tip" content="Your plans and tasks are **fully compatible** &mdash; no changes needed. This migration only swaps the delivery mechanism (slash commands &rarr; skills); your `.ai/` content carries over untouched." %}

{% include callout.html variant="warning" content="Steps 1&ndash;3 delete files and rename directories. Review each path against your project before running, and make sure your work is committed first." %}

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

In AI Task Manager the workspace lived under `.ai/task-manager/`, so the scripts to remove are there:

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

| AI Task Manager              | Strikethroo                     |
|------------------------------|---------------------------------|
| Slash commands (per-harness) | Agent Skills (harness-agnostic) |
| `.cjs` scripts in config     | Bundled into skills             |
| `claude-exec` CLI subcommand | Removed                         |

## What didn't change

{% capture unchanged %}
- `.ai/strikethroo/plans/` and `archive/` are unchanged
- All plan and task markdown files work as-is
- Hooks and templates in `.ai/strikethroo/config/` are preserved
- `STRIKETHROO.md` project context is preserved
{% endcapture %}
{% include callout.html variant="tip" title="SAFE TO KEEP" content=unchanged %}
