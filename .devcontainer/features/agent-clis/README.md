# AI Coding Agent CLIs (`agent-clis`)

Installs AI coding agent CLIs into the dev container: OpenCode, Claude Code,
GitHub Copilot CLI, Cursor CLI, and Codex. Each is individually toggleable.

## Usage

Referenced locally from `devcontainer.json` (relative to the `.devcontainer/`
folder):

```jsonc
"features": {
  "./features/agent-clis": {}
}
```

## Options

| Option     | Type    | Default | Description                  |
| ---------- | ------- | ------- | ---------------------------- |
| `opencode` | boolean | `true`  | Install the OpenCode CLI     |
| `claude`   | boolean | `true`  | Install the Claude Code CLI  |
| `copilot`  | boolean | `true`  | Install the GitHub Copilot CLI |
| `cursor`   | boolean | `true`  | Install the Cursor CLI       |
| `codex`    | boolean | `true`  | Install the Codex CLI        |

Example — only Claude Code and Codex:

```jsonc
"features": {
  "./features/agent-clis": { "opencode": false, "copilot": false, "cursor": false }
}
```

## Notes

- Tools are installed to a shared, user-writable npm prefix
  (`/usr/local/share/npm-global`) and the remote user's `~/.local/bin`. Add both
  to `PATH` (the project's `devcontainer.json` does this via `remoteEnv`).
- Per-user installers run as the remote (non-root) user so their artifacts are
  visible at runtime rather than landing in root's home.

## Project mounts

The project's `devcontainer.json` mounts host agent configuration directly and
seeds credentials into writable container locations on start.

Shared agent assets:

| Host path | Container path | Mode |
| --------- | -------------- | ---- |
| `~/.agents/AGENTS.md` | `/home/node/.agents/AGENTS.md` | read-only bind |
| `~/.agents/agents` | `/home/node/.agents/agents` | read-only bind |
| `~/.agents/skills` | `/home/node/.agents/skills` | read-only bind |
| `~/.agents/hooks` | `/home/node/.agents/hooks` | read-only bind |

OpenCode:

| Host path or volume | Container path | Mode |
| ------------------- | -------------- | ---- |
| `~/.config/opencode/opencode.jsonc` | `/home/node/.config/opencode/opencode.jsonc` | read-only bind |
| `~/.config/opencode/plugin` | `/home/node/.config/opencode/plugin` | read-only bind |
| `~/.config/opencode/node_modules` | `/home/node/.config/opencode/node_modules` | read-only bind |
| `~/.cache/opencode` | `/home/node/.cache/opencode` | writable bind |
| `opencode-data-${devcontainerId}` | `/home/node/.local/share/opencode` | writable volume |
| `~/.local/share/opencode/auth.json` | `/home/node/.cred-seed/opencode/auth.json` | read-only seed bind |

Claude:

| Host path | Container path | Mode |
| --------- | -------------- | ---- |
| `~/.claude/.credentials.json` | `/home/node/.cred-seed/claude/.credentials.json` | read-only seed bind |
| `~/.claude/CLAUDE.md` | `/home/node/.claude/CLAUDE.md` | read-only bind |
| `~/.claude.json` | `/home/node/.claude.json` | read-only bind |
| `~/.claude/settings.json` | `/home/node/.claude/settings.json` | read-only bind |
| `~/.claude/skills` | `/home/node/.claude/skills` | read-only bind |
| `~/.claude/hooks` | `/home/node/.claude/hooks` | read-only bind |
| `~/.claude/commands` | `/home/node/.claude/commands` | read-only bind |

Codex:

| Host path | Container path | Mode |
| --------- | -------------- | ---- |
| `~/.codex/prompts` | `/home/node/.codex/prompts` | read-only bind |
| `~/.codex/auth.json` | `/home/node/.cred-seed/codex/auth.json` | read-only seed bind |

Copilot:

| Host path | Container path | Mode |
| --------- | -------------- | ---- |
| `~/.copilot/config.json` | `/home/node/.copilot/config.json` | read-only bind |
| `~/.copilot/hooks` | `/home/node/.copilot/hooks` | read-only bind |

Cursor:

| Host path | Container path | Mode |
| --------- | -------------- | ---- |
| `~/.cursor/cli-config.json` | `/home/node/.cursor/cli-config.json` | read-only bind |
| `~/.config/cursor/auth.json` | `/home/node/.cred-seed/cursor/auth.json` | read-only seed bind |

`postStartCommand.seed-auth` runs `.devcontainer/scripts/seed-auth.sh`, copying
the credential seed binds into the tools' writable runtime paths. This keeps
host credential files read-only while allowing tools inside the container to
update their own runtime state.

## Making this reusable across projects

This is currently a **local** Feature. To reuse it across repositories without
copying it, move this folder into a dedicated Feature repo
(`src/agent-clis/`), scaffolded from
[`devcontainers/feature-starter`](https://github.com/devcontainers/feature-starter),
and publish it to GHCR with that repo's release GitHub Action. Projects then
reference it as:

```jsonc
"features": {
  "ghcr.io/<owner>/devcontainer-features/agent-clis:1": {}
}
```

Remember to flip the published GHCR package to **public**, or other projects
cannot pull it.
