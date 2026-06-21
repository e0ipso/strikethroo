# t3 CLI (`t3`)

Installs the [t3](https://www.npmjs.com/package/t3) CLI globally via npm.

## Usage

Referenced locally from `devcontainer.json` (relative to the `.devcontainer/`
folder):

```jsonc
"features": {
  "./features/t3": {}
}
```

## Options

| Option    | Type   | Default  | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `version` | string | `latest` | npm dist-tag or version to install (e.g. `1.2.3`)      |

## Notes

- Installed to the shared npm prefix `/usr/local/share/npm-global`; add its
  `bin` to `PATH` (the project's `devcontainer.json` does this via `remoteEnv`).
- The install runs as the remote (non-root) user so the binary is visible at
  runtime rather than landing in root's home.

## Project mounts

The project's `devcontainer.json` keeps t3 runtime state writable while seeding
settings from a read-only host copy.

| Host path or volume | Container path | Mode |
| ------------------- | -------------- | ---- |
| `t3code-home-${devcontainerId}` | `/home/node/.t3` | writable volume |
| `~/.t3/devcontainer/settings.json` | `/home/node/.cred-seed/t3/settings.json` | read-only seed bind |

`T3CODE_HOME` is set to `/home/node/.t3`. On container start,
`.devcontainer/scripts/seed-t3-settings.sh` copies the read-only seed to
`$T3CODE_HOME/userdata/settings.json` only when that runtime file does not
already exist. This prevents t3 from editing the host file while still letting
the container's server settings drift after the first seed.

Do not point the read-only seed at the live desktop
`~/.t3/userdata/settings.json`; t3 writes settings atomically, so a live
single-file bind mount can become stale or fail when the host process renames
over the file.

## Making this reusable across projects

This is currently a **local** Feature. To reuse it across repositories, move
this folder into a dedicated Feature repo (`src/t3/`), scaffolded from
[`devcontainers/feature-starter`](https://github.com/devcontainers/feature-starter),
publish it to GHCR, and reference it as
`ghcr.io/<owner>/devcontainer-features/t3:1`. Remember to flip the published
GHCR package to **public**.
