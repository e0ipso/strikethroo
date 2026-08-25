---
layout: default
title: Migration Guides
nav_order: 8
description: "Upgrade from AI Task Manager to Strikethroo, and from the retired skills installer to init-installed skills"
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

Replace `claude` with your harness(es), e.g. `claude,gemini,opencode`. This one command creates the workspace **and** installs the workflow skills into each harness's skills directory &mdash; there is no second install step.

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

Older versions of Strikethroo installed the workflow skills separately, with `npx skills add e0ipso/strikethroo`. That step is gone: `npx strikethroo init --harnesses <list>` now installs the skills itself, from the published npm package, and overwrites them on every run.

If you never ran the old installer, there is nothing to do here.

## Where each installer wrote

The old installer's project-local destination depended on the harness you selected, and for every harness except Claude Code it was the shared `.agents/skills/` directory &mdash; not a harness-specific one. `init` writes harness-specific directories instead, so the two agree in only two cases.

| Harness | `init` writes | `npx skills add` wrote | `npx skills add --global` wrote | Collides? |
|---------|---------------|------------------------|---------------------------------|-----------|
| `claude` | `.claude/skills/` | `.claude/skills/` | `~/.claude/skills/` | **Yes** (project) |
| `codex` | `.agents/skills/` | `.agents/skills/` | `$CODEX_HOME/skills/` (default `~/.codex/skills/`) | **Yes** (project) |
| `cursor` | `.cursor/skills/` | `.agents/skills/` | `~/.cursor/skills/` | No |
| `gemini` | `.gemini/skills/` | `.agents/skills/` | `~/.gemini/skills/` | No |
| `copilot` | `.github/skills/` | `.agents/skills/` | `~/.copilot/skills/` | No |
| `opencode` | `.opencode/skills/` | `.agents/skills/` | `$XDG_CONFIG_HOME/opencode/skills/` (default `~/.config/opencode/skills/`) | No |

{% capture stale_copies %}
Where the two locations **do not** collide, running `init` does not replace the old copy &mdash; it adds a second one. You now have two sets of `st-*` skills on disk, the harness may load either, **and there is no error and no way to tell from the outside which one it picked.** The old copy is frozen at whatever version you last installed, so the two will drift. Delete the stale copy.

`--global` installs never collide, for any harness: `init` only ever writes inside the project.
{% endcapture %}
{% include callout.html variant="warning" title="TWO COPIES, SILENTLY" content=stale_copies %}

## Remove the stale copies

Run this from the repository root **only if you did not pass `codex` to `init`** &mdash; `.agents/skills/` is where `init` puts the Codex copy, so for a Codex workspace those directories are the current ones and must stay:

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

For a global install, the same seven directories live under the per-harness global path in the table above &mdash; for example:

```bash
rm -rf ~/.claude/skills/st-create-plan \
  ~/.claude/skills/st-generate-tasks \
  ~/.claude/skills/st-execute-blueprint \
  ~/.claude/skills/st-refine-plan \
  ~/.claude/skills/st-execute-task \
  ~/.claude/skills/st-full-workflow \
  ~/.claude/skills/st-code-review
```

{% include callout.html variant="note" content="The seven directories are listed by name on purpose. `rm -rf .agents/skills/st-*` would also take any unrelated skill of yours whose name happens to start with `st-`." %}

## Verify

```bash
find . -maxdepth 3 -type d -name st-create-plan -not -path "./node_modules/*"
```

Expect one hit per harness you initialized, each under that harness's directory from the `init` column. Any other path is a leftover copy. Repeat with your global paths if you ever installed with `--global`.
