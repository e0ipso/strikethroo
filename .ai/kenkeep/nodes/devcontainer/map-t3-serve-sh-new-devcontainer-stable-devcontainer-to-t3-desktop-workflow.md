---
schema_version: 2
id: map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow
title: t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow
kind: map
tags:
  - devcontainer
  - t3
  - docker
  - workflow
derived_from:
  - '05a1bddf-ef9e-4147-8e07-0b971366c7d7:map:0'
relates_to: []
depends_on: []
confidence: high
summary: >-
  Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a
  deterministic port; t3-serve.sh is exec-only.
---
Two complementary tools enable a stable per-repo t3 desktop connection:

**`new-devcontainer`** (host script at `~/.local/bin/`; canonical template at `~/.config/devcontainer-templates/t3/`; source export at `t3-template-export/local/bin/new-devcontainer`): Copies `.devcontainer/` into the current repo. Computes a deterministic host port from the repo dir **basename** via POSIX `cksum`, mapped to 20000–29999, and bakes it as a literal into `devcontainer.json`. The port is fixed at scaffold time so the container starts correctly from any launch path (VS Code, bare `devcontainer up`, etc.).

**`.devcontainer/t3-serve.sh`** (exec-only wrapper, committed to the repo): Runs `t3 serve --host 0.0.0.0 --mode web --no-browser` inside the already-running container. Does not start or recreate the container. The host publish (`127.0.0.1:<baked-port>:34489`) is a literal in `devcontainer.json`. After the first pairing, the desktop session persists in the `t3code-home-${devcontainerId}` Docker volume across restarts.

**Workflow**: start the container (`devcontainer up` or VS Code), then run `./.devcontainer/t3-serve.sh`; connect t3 desktop to `http://127.0.0.1:<port>` + the printed pairing token.
