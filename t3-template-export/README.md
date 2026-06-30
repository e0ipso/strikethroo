# t3 devcontainer template — host install

This folder was staged inside the devcontainer at `/workspace/t3-template-export`
(which maps to this repo's directory on your host). Move its contents onto your
**host** as below, then delete the staging folder.

## Layout (mirrors your `~`)

```
config/devcontainer-templates/t3/.devcontainer/   ->  ~/.config/devcontainer-templates/t3/.devcontainer/
local/bin/new-devcontainer                        ->  ~/.local/bin/new-devcontainer
```

## Install (run on the HOST, from this repo's directory)

```bash
# 1. canonical template payload (overwrite any previous copy)
mkdir -p ~/.config/devcontainer-templates
rm -rf ~/.config/devcontainer-templates/t3
cp -R ./t3-template-export/config/devcontainer-templates/t3 ~/.config/devcontainer-templates/

# 2. scaffold command on PATH
mkdir -p ~/.local/bin
cp ./t3-template-export/local/bin/new-devcontainer ~/.local/bin/
chmod +x ~/.local/bin/new-devcontainer
#    ensure ~/.local/bin is on your PATH (e.g. add to ~/.bashrc / ~/.zshrc):
#    export PATH="$HOME/.local/bin:$PATH"

# 3. clean up the staging folder
rm -rf ./t3-template-export
```

## Use

```bash
cd <new-or-existing-repo>
rm -rf .devcontainer        # only when modernizing an existing repo
new-devcontainer            # copies the template in AND bakes the per-repo port

# start the container however you like — the port is already in devcontainer.json:
devcontainer up --workspace-folder .     # or VS Code "Reopen in Container"

# then serve; connect t3 desktop to the printed http://127.0.0.1:<port> + token:
./.devcontainer/t3-serve.sh
```

## How the port works

- The published **host** port is the repo dir **basename** hashed into
  20000-29999. `new-devcontainer` computes it once and writes it as a LITERAL
  into `devcontainer.json` (`127.0.0.1:<port>:34489`). Nothing to set, no env
  vars, no ordering — it applies however the container is started.
- The container always serves on the fixed internal port `34489`; only the host
  port differs per repo, so many devcontainers run at once without collisions.
- `t3-serve.sh` is exec-only: it reads the port back from `devcontainer.json` and
  runs `t3 serve` inside the already-running container.

## Notes & caveats

- `--publish` is baked at container **creation**. If you ever change the port
  (e.g. after moving/renaming the repo), re-scaffold (`rm -rf .devcontainer &&
  new-devcontainer`) and recreate the container
  (`devcontainer up --remove-existing-container`).
- Same-basename repos hash to the same port — fine unless you run both at once.
- `name` / `--hostname` use `${localWorkspaceFolderBasename}`; assumes the repo
  dir basename is a valid hostname label (no dots/underscores).
- The seed scripts under `scripts/` mirror your multi-assistant credential setup;
  trim them in the canonical copy if a machine doesn't use all providers.
- Override the template location per-invocation with
  `DEVCONTAINER_TEMPLATE_DIR=/some/path new-devcontainer`.
