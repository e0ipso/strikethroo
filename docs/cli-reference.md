---
layout: default
title: CLI Reference
parent: Reference
nav_order: 2
description: "Command reference for the Strikethroo CLI and skills installer"
---

# CLI Reference

Strikethroo has two distribution channels: the **CLI** (workspace bootstrapping) and the **skills installer** (workflow delivery). They are independently re-runnable; the only coupling point is the workspace schema version.

## Workspace Initialization

```bash
npx strikethroo init --harnesses <harness>[,<harness>...] [options]
```

Creates the shared `.ai/strikethroo/` directory (plans, archive, config, hooks, templates) and copies harness-specific artifacts (e.g., `.claude/agents/` for Claude).

**Required flag:**

| Flag | Description |
|------|-------------|
| `--harnesses <list>` | Comma-separated harness names. Controls which per-harness artifacts are copied. Accepted values: `claude`, `gemini`, `opencode`, `codex`, `copilot`, `cursor`, `kiro`. |

**Optional flags:**

| Flag | Description |
|------|-------------|
| `--destination-directory <path>` | Target directory for the workspace. Defaults to the current working directory. |
| `--force` | Overwrite all files without prompting, even if the user has customized them. Useful for CI/automation. |

**File conflict detection:** On re-run, `init` compares file hashes against `.ai/strikethroo/.init-metadata.json`. Unchanged files are updated silently; modified files trigger a unified-diff prompt. Use `--force` to bypass prompts.

**Examples:**

```bash
# Single harness
npx strikethroo init --harnesses claude

# Multiple harnesses
npx strikethroo init --harnesses claude,gemini,codex

# Target a different directory
npx strikethroo init --harnesses claude --destination-directory /path/to/project

# Force overwrite (automation)
npx strikethroo init --harnesses claude --force
```

## Serve the Workspace Viewer

```bash
npx strikethroo serve [options]
```

Boots a local web app over an initialized `.ai/strikethroo/` workspace: a dependency-light Node server hosts the prebuilt single-page viewer as static assets, exposes a read-only JSON API over the workspace model, and streams a coalesced change event over Server-Sent Events whenever the workspace mutates on disk. Run it from inside an initialized workspace; if none is found it prints guidance to run `init` and exits without binding.

{% capture serve_readonly %}
The viewer is **read-only except for one permitted mutation: the archive action.** A plan whose tasks are all complete (derived state `done`) shows an **Archive** control; confirming it issues `POST /api/plans/:id/archive`, which atomically renames that plan's directory from `plans/` to `archive/`. It is strictly a directory move &mdash; no files are deleted or edited, and only `done` plans are accepted. This is the manual escape hatch for plans that are done but not yet archived; it does not replace the automatic archival the `st-execute-blueprint` skill performs on successful completion.
{% endcapture %}
{% include callout.html variant="note" title="READ-ONLY, WITH ONE EXCEPTION" content=serve_readonly %}

**Optional flags:**

| Flag | Description |
|------|-------------|
| `--port <n>` | Port to bind. Defaults to `4317`. |
| `--no-open` | Do not open the browser on start. |
| `--workspace <path>` | Override workspace root discovery. |

## Skill Installation

```bash
npx skills add e0ipso/strikethroo
```

Installs the Agent Skills that implement the three-step workflow. Skills are fetched from the repository's tagged release via the `.claude-plugin/plugin.json` manifest.

**Pin a specific version:**

```bash
npx skills add e0ipso/strikethroo@<tag>
```

**Update skills:**

Re-run the same command to pull the latest version.

## Skill Removal

```bash
npx skills remove e0ipso/strikethroo
```

Removes the installed Agent Skills. The `.ai/strikethroo/` workspace, plans, and configuration are not affected.

## Shipped Skills

| Skill | Purpose |
|-------|---------|
| `st-create-plan` | Strategic plan creation with mandatory clarification gates. |
| `st-generate-tasks` | Task decomposition with dependency mapping and skill assignments. |
| `st-execute-blueprint` | Execution orchestration across all tasks in a plan. |
| `st-refine-plan` | Plan refinement loop with interactive and autonomous clarification modes. |
| `st-execute-task` | Single-task execution with dependency and status checks. |
| `st-full-workflow` | End-to-end orchestration chaining all three steps. |
