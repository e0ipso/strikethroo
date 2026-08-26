---
layout: default
title: Migration guides
nav_order: 8
description: "Upgrade older Strikethroo installations"
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

Replace `claude` with your harnesses, such as `claude,gemini,opencode`. `init` creates the workspace and installs the workflow skills.

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

---

# Upgrade from the retired skills installer to `init`

Older versions used `npx skills add e0ipso/strikethroo`. If you ran it, remove its stale copies after running `npx strikethroo init --harnesses <list>`.

## Where each installer wrote

Project installs used `.claude/skills/` for Claude and `.agents/skills/` for every other harness. `init` uses these harness-specific directories:

| Harness | `init` writes | `npx skills add` wrote | `npx skills add --global` wrote | Collides? |
|---------|---------------|------------------------|---------------------------------|-----------|
| `claude` | `.claude/skills/` | `.claude/skills/` | `~/.claude/skills/` | **Yes** (project) |
| `codex` | `.agents/skills/` | `.agents/skills/` | `$CODEX_HOME/skills/` (default `~/.codex/skills/`) | **Yes** (project) |
| `cursor` | `.cursor/skills/` | `.agents/skills/` | `~/.cursor/skills/` | No |
| `gemini` | `.gemini/skills/` | `.agents/skills/` | `~/.gemini/skills/` | No |
| `copilot` | `.github/skills/` | `.agents/skills/` | `~/.copilot/skills/` | No |
| `opencode` | `.opencode/skills/` | `.agents/skills/` | `$XDG_CONFIG_HOME/opencode/skills/` (default `~/.config/opencode/skills/`) | No |

{% capture stale_copies %}
If the locations differ, `init` leaves the old copy in place. The harness may load that stale copy without warning, so delete it. Global installs also remain because `init` writes only inside the project.
{% endcapture %}
{% include callout.html variant="warning" title="TWO COPIES, SILENTLY" content=stale_copies %}

## Remove the stale copies

Run this from the repository root only if you did not pass `codex` to `init`. Codex uses `.agents/skills/`, so those directories are current and must stay in a Codex workspace.

```bash
rm -rf .agents/skills/st-create-plan \
  .agents/skills/st-generate-tasks \
  .agents/skills/st-execute-blueprint \
  .agents/skills/st-refine-plan \
  .agents/skills/st-execute-task \
  .agents/skills/st-full-workflow \
  .agents/skills/st-code-review
rmdir .agents/skills .agents 2>/dev/null
```

The old installer also recorded project installs in `skills-lock.json` at the repository root. Delete its `st-*` entries, or the whole file if Strikethroo was the only thing it tracked.

For a global install, remove the same seven directories under the global path in the table. For example:

```bash
rm -rf ~/.claude/skills/st-create-plan \
  ~/.claude/skills/st-generate-tasks \
  ~/.claude/skills/st-execute-blueprint \
  ~/.claude/skills/st-refine-plan \
  ~/.claude/skills/st-execute-task \
  ~/.claude/skills/st-full-workflow \
  ~/.claude/skills/st-code-review
```

{% include callout.html variant="note" content="The command names all seven directories to avoid deleting an unrelated skill whose name starts with `st-`." %}

## Verify

```bash
find . -maxdepth 3 -type d -name st-create-plan -not -path "./node_modules/*"
```

Expect one result under each initialized harness's directory. Any other result is stale. Check the global paths too if you used `--global`.
