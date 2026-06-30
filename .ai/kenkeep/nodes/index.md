---
schema_version: 2
nodes_hash: 'sha256:0ac39ca7bca430594e1487371ccf7ee95127186c44d568dfd68d53863c02032f'
node_count: 2
---
# kenkeep Index

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
- Load [`capture/`](capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`conventions/`](conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`devcontainer/`](devcontainer/index.md) for more information on devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer.
- Load [`git/`](git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and skill-artifact force-adding.
- Load [`serve/`](serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](web/index.md) for more information on Web.

## Conventions (how we build)
_None yet._

## Components (what exists)
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) to learn about: Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands. #cli #architecture
- Open [**docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site**](map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site.md) to learn about: docs/_config.yml sets baseurl and the aux_links GitHub URL; both must match the current repo slug for the Jekyll docs site to serve correctly. #docs #github-pages #jekyll

## By topic

### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #cli
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
### #docs
- Open [**docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site**](map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site.md) — docs/_config.yml sets baseurl and the aux_links GitHub URL; both must match the current repo slug for the Jekyll docs site to serve correctly.
### #github-pages
- Open [**docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site**](map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site.md) — docs/_config.yml sets baseurl and the aux_links GitHub URL; both must match the current repo slug for the Jekyll docs site to serve correctly.
### #jekyll
- Open [**docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site**](map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site.md) — docs/_config.yml sets baseurl and the aux_links GitHub URL; both must match the current repo slug for the Jekyll docs site to serve correctly.
