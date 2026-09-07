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
npx strikethroo init [--harnesses <harness>[,<harness>...]] [options]
```

Creates the shared `.ai/strikethroo/` directory (plans, archive, config, hooks, templates) and copies harness-specific artifacts (e.g., `.claude/agents/` for Claude).

**Harness selection:**

| Flag | Description |
|------|-------------|
| `--harnesses <list>` | Comma-separated harness names. Controls which per-harness artifacts are copied. Accepted values: `claude`, `gemini`, `opencode`, `codex`, `copilot`, `cursor`. **Optional on re-init** — omission reuses the saved `harnesses` array from `.ai/strikethroo/.init-metadata.json`. **Required on first init** and on legacy workspaces whose metadata has no saved selection. Empty or invalid explicit values error and do not fall back to the saved list. There is no filesystem or executable auto-detection. |

**Optional flags:**

| Flag | Description |
|------|-------------|
| `--destination-directory <path>` | Target directory for the workspace. Defaults to the current working directory. |
| `--force` | Overwrite all files without prompting, even if the user has customized them. Useful for CI/automation. |
| `--profile <value>` | Seed the workspace `config/` from a [strikethroo profile](customization.html#strikethroo-profiles): a local directory, a GitHub `<user>/<repo>` shorthand, or any git URL. Remote profiles are shallow-cloned (`git` required on PATH). |

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

# Seed from a strikethroo profile (local folder, GitHub shorthand, or git URL)
npx strikethroo init --harnesses claude --profile someuser/drupal-profile
```

## Update Workspace and Skills

```bash
npx strikethroo@latest update [--harnesses <harness>[,<harness>...]] [options]
```

Refreshes an initialized workspace and updates the seven installed Strikethroo workflow skills. Requires an existing `.ai/strikethroo/.init-metadata.json`; uninitialized directories must run `init` first.

**Flow:**

1. Resolve harnesses (same rules as `init`: explicit `--harnesses`, else saved metadata, else error).
2. Run `init` in update mode with the same hash-based conflict handling as a normal re-init (no implicit `--force`).
3. Spawn `npx skills@1.5.24 update st-create-plan st-refine-plan st-generate-tasks st-execute-blueprint st-execute-task st-full-workflow st-code-review` with `shell: false`, inherited input, and output streamed to the terminal. The installer checks matching project and global installations; Strikethroo does not pass `-y`, `-g`, `-p`, or harness names as installer agents. The installer version is pinned because Strikethroo also checks its output for missing installations, skipped skills, cancellations, and check failures that exit zero.

**Exit behavior:** Combined exit 0 only when workspace refresh **and** skills update both succeed. A workspace failure skips the installer. An installer failure, missing installation, skipped skill, or cancellation after a successful workspace refresh keeps the refreshed workspace, exits 1, and prints recovery guidance (re-run `update` or the reported `npx skills update …` command).

**Flags:** Same as `init` — `--harnesses`, `--destination-directory`, `--force`, `--profile`.

**After updating:** Start a fresh agent session. A running session may still follow previous skill instructions. Parent workflow skills check for newer releases at most once per workspace per 24 hours and may append an update notice after their structured summary; old skill copies cannot notify until you run `update` once.

**Examples:**

```bash
# Typical upgrade path for an existing project
npx strikethroo@latest update

# Override harness selection for this refresh
npx strikethroo@latest update --harnesses claude,cursor

# Legacy workspace with no saved harnesses (once)
npx strikethroo@latest update --harnesses claude
```

## Profile Export

```bash
npx strikethroo export profile --destination-directory <dir>
```

Packages the current workspace's configuration as a shareable [strikethroo profile](customization.html#strikethroo-profiles): copies `config/` (minus the CLI-owned `schemas/`) verbatim, collects the `profile.yaml` manifest interactively, refuses a non-empty destination, and validates the result against the same contract `init --profile` enforces.

## Serve the Workspace Viewer

```bash
npx strikethroo serve [options]
```

Boots a local web app over an initialized `.ai/strikethroo/` workspace: a dependency-light Node server hosts the prebuilt single-page viewer as static assets, exposes a read-only JSON API over the workspace model, and streams a coalesced change event over Server-Sent Events whenever the workspace mutates on disk. Run it from inside an initialized workspace; if none is found it prints guidance to run `init` and exits without binding.

{% capture serve_readonly %}
The viewer is **read-only except for two sanctioned mutations: the archive action and the config editor.**

**Archive.** A plan whose tasks are all complete (derived state `done`) shows an **Archive** control; confirming it issues `POST /api/plans/:id/archive`, which atomically renames that plan's directory from `plans/` to `archive/`. It is strictly a directory move &mdash; no files are deleted or edited, and only `done` plans are accepted. This is the manual escape hatch for plans that are done but not yet archived; it does not replace the automatic archival the `st-execute-blueprint` skill performs on successful completion.

**Config editor.** The **Customize** section edits your workspace configuration in place, issuing `PUT /api/config/:kind/:id` to overwrite a single existing file. It is overwrite-only and never creates, deletes, or renames: `kind` is restricted to `hooks` and `templates`, each resolving to one flat `config/<kind>/<id>.md` file, plus the special `workspace` kind behind the Customize Config form, which maps to `config/config.yaml`. Anything outside that allowlist &mdash; path separators, `..`, an unknown kind, a file that does not already exist &mdash; is rejected. Saving `config.yaml` through the form preserves unrecognized top-level sections but **does not preserve comments**.

Separately, the **Self Review** action (`POST /api/self-review`) writes nothing itself, but does launch an external reviewer process on your machine.
{% endcapture %}
{% include callout.html variant="note" title="READ-ONLY, WITH TWO EXCEPTIONS" content=serve_readonly %}

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

Installs the seven shipped Agent Skills from the repository's default branch. The upstream `skills` CLI discovers them by walking the repository's root `skills/` directory directly; `.claude-plugin/plugin.json` lists the same skills for Claude plugin tooling but is not what the bare installer consults first.

**Install a specific branch or tag:**

```bash
npx skills add e0ipso/strikethroo#v3.19.0
```

`#<git-ref>` is the installer's own Git-ref syntax, not a Strikethroo-specific feature — any branch or tag name works. `@<name>` filters by skill name; it does not select a version.

**Update skills:**

For an initialized workspace, prefer the unified update command:

```bash
npx strikethroo@latest update
```

It refreshes the workspace and runs `npx skills update` for all seven workflow skills. To update skills alone, re-run `npx skills add e0ipso/strikethroo` or the scoped `npx skills update …` command that `update` reports.

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
| `st-full-workflow` | End-to-end orchestration: plan, tasks, and execution in one pass, with no approval gate. |
