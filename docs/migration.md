---
layout: default
title: Migrating from AI Task Manager
nav_order: 8
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

## Upgrading an existing Strikethroo workspace

If you already use Strikethroo with `.ai/strikethroo/`, prefer a single update command:

```bash
npx strikethroo@latest update
```

It refreshes the workspace and updates all seven workflow skills. Workspaces whose `.init-metadata.json` has no saved `harnesses` field must pass `--harnesses` once on `init` or `update`. After updating, start a fresh agent session so parent skills load the new instructions (including daily update notices). Old skill copies cannot notify until you run `update` once.

## Security hardening release

This release tightens the viewer, the task and review scripts, the setup-profile commands, and the CI pipeline. Most workspaces need no change. Check the list below if you used any of these behaviors. After upgrading, run `npx strikethroo@latest update` and start a fresh agent session.

- **JavaScript (and other executable) task frontmatter is rejected.** Task files are read as plain YAML. A task whose opening fence is `---js`, `---javascript`, `---coffee`, or any other tagged fence now stops dispatch with an `infrastructure-failure` result, as do malformed YAML, frontmatter that is not a mapping, and an `execution_profile` that is not a string. Who is affected: anyone who hand-wrote tagged frontmatter. Remedy: use a plain `---` fence with YAML keys.
- **Symbolic links in privileged paths are rejected.** `.init-metadata.json` (and the `.ai/strikethroo` directory above it), the files and directories under `config/` that the viewer reads or writes, plan files given to self-review, and a strikethroo profile's `profile.yaml`, `config/`, and anything inside `config/` must be regular files and directories. `init`, `update`, `export profile`, and the viewer report which path is a link. Who is affected: workspaces that symlink config or metadata elsewhere, for example into a shared dotfiles repository. Remedy: replace the link with a real copy, or manage the shared file by copying it in.
- **Setup-profile sources starting with `-` are rejected.** `--profile` accepts a directory, a `<user>/<repo>` shorthand, or a git URL, and refuses a value that begins with `-` unless it names an existing directory. Remedy: pass a path such as `./-name` for a local folder.
- **`export profile` refuses link-containing config and prints a sharing notice.** The package copies `config/config.yaml` and your hooks verbatim, including machine-local paths and harness arguments. Remedy: remove links before exporting, and review the package before you share it.
- **The viewer is reachable only from the local machine.** `serve` binds to `127.0.0.1` (or `::1`) and refuses requests whose `Host` is not that address. Who is affected: anyone who reached the viewer from another machine, through a LAN address, a container port mapping, or a reverse proxy. Remedy: run `serve` on the machine you browse from, or forward the port yourself over SSH (`ssh -L 4317:127.0.0.1:4317 host`) and browse `localhost` on the same port number; a different local port makes the `Host` header disagree with the server's port and is refused.
- **External images and active HTML are no longer rendered.** Plan and task Markdown is sanitized with an allowlist: forms and controls, `iframe`, `object`, `embed`, `video`, `audio`, inline `svg`/`math`, `style`, and author `id`/`class` are removed, and images from other sites are replaced by their alt text or a link. Mermaid diagrams can no longer override their security, theme, or size settings. Remedy: link to external images instead of embedding them, or use a relative path or a small `data:` image; see [Supported markup](visualizations.html#supported-markup).
- **Viewer mutations require the session capability.** Archive, config save, and self-review need the `X-Strikethroo-Capability` header carrying the token from `GET /api/session`, a same-origin request, and `Content-Type: application/json`. The viewer's own pages do this automatically, and a page left open across a server restart picks up the new token on its next save. Who is affected: scripts that call `PUT /api/config/...`, `POST /api/plans/:id/archive`, or `POST /api/self-review` directly. Remedy: fetch the token first and send it; the CLI reference shows the flow in [Serve the Workspace Viewer](cli-reference.html#serve-the-workspace-viewer). A request with a foreign `Origin` or a cross-site `Sec-Fetch-Site` is refused even with a valid token.
- **Self-review launches and live-update streams are bounded.** One self-review per plan (`409`), two at once (`429`), and 16 open event streams (`503`).
- **Review documents with a DTD or entities are refused.** A findings document containing `<!DOCTYPE`, `<!ENTITY`, `<!ELEMENT`, `<!ATTLIST`, or `<!NOTATION` is `schema-invalid`, and a finding count that `xmllint` cannot confirm is not recorded. If Git cannot list or diff the changed files, the code review gate reports an infrastructure failure instead of reviewing a partial scope.
- **Development tooling and CI changed.** The repository now builds with Vite 8 and tests with Vitest 5, which need a current Node 22 or 24 release. Release automation is split into a read-only `verify` job and a credentialed `release` job, workflow actions are pinned to commit SHAs, and `npm run security:check` gates dependency advisories using `security/dependency-dispositions.json`. Who is affected: contributors and forks that carry their own workflows. Remedy: pin actions the same way and add dispositions with a reason for any advisory you accept.

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
