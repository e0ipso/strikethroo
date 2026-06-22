# Cursor Cloud specific instructions

Durable, non-obvious setup/run caveats for developing this repo inside a Cursor Cloud Agent VM. Standard commands live in [`AGENTS.md`](../AGENTS.md) (`## Quick Start`, `## Build Pipeline`, `## Testing`).

Dependencies are installed automatically on VM startup (`npm install`). Node 22+ is present.

- **Build before running the CLI or `serve`.** `npm install` only runs `husky`. Run `npm run build` (see `## Build Pipeline`) to produce `dist/` + `dist-web/` before `node dist/cli.js …`. `npm run test:unit` and `npm run lint` run against `src/` and need no build.
- **`serve` requires an initialized workspace.** It resolves `<project>/.ai/strikethroo/.init-metadata.json` (walks upward from cwd, or use `--workspace <projectDir>`). To get content to view: `node dist/cli.js init --harnesses claude --destination-directory <dir> --force`, then `node dist/cli.js serve --no-open --port 4317 --workspace <dir>`. The fixture workspace at `src/capture/fixtures/capture-workspace/` is laid out flat (no `.ai/strikethroo/` wrapper) so it is **not** directly servable — copy its `plans/`+`archive/` into an initialized workspace to demo real data.
- **e2e self-installs its browser.** `npm run test:e2e` runs `pretest:e2e` (`playwright install --with-deps chromium`) first; unit (190) and e2e (36) suites pass green here.
- Hot-reloading dev viewer: `npm run dev:serve` (ts-node, `--no-open`).
