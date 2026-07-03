---
schema_version: 2
nodes_hash: 'sha256:dc76dd3483e7f5cfaa80b37b1c16af81f20e52964f2acea7250547a1a4c62470'
node_count: 1
summary: >-
  CLI command surface and command-routing boundaries; read when changing
  src/cli.ts or documenting available commands
---
# kenkeep Index: cli

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
_None yet._

## Components (what exists)
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) to learn about: Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands. #cli #architecture

## By topic

### #architecture
- Open [**Serve layer uses discriminated-union result types, not custom error classes**](../serve/practice-serve-layer-uses-discriminated-union-result-types-not-custom-error-classes.md) — AGENTS.md's FileSystemError/ConfigError classes are aspirational; the actual serve convention is a discriminated ArchiveResult/LaunchResult union.
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
### #cli
- Open [**CLI exposes only init and serve commands**](map-cli-exposes-only-init-and-serve-commands-all-visualization-management-commands-removed.md) — Running strikethroo --help lists only init and serve; there are no visualization/management (status, plan) commands.
