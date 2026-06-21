---
schema_version: 2
nodes_hash: 'sha256:a5d7cb655bd37e223ffee4f3c54eff0a3619b854f37ded3481073efc3b5ae252'
node_count: 71
---
# kenkeep

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Branches
- Load [`capture/`](nodes/capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`cli/`](nodes/cli/index.md) for more information on the strikethroo CLI surface and init/serve commands; read when changing src/cli.ts or the CLI command set.
- Load [`conventions/`](nodes/conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](nodes/dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`docs/`](nodes/docs/index.md) for more information on Jekyll docs site configuration under docs/; read when changing GitHub Pages baseurl or docs/_config.yml.
- Load [`git/`](nodes/git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](nodes/release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and skill-artifact force-adding.
- Load [`serve/`](nodes/serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](nodes/skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](nodes/testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](nodes/tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](nodes/web/index.md) for more information on Web.
