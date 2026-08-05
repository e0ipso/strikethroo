---
schema_version: 3
nodes_hash: 'sha256:d24ae5be6acc9546939dd7030945a5f11b260cabd900e8367b582f426bb18692'
node_count: 80
---
# kenkeep

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Branches
- Load [`capture/`](nodes/capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`code-review/`](nodes/code-review/index.md) for more information on Code Review.
- Load [`conventions/`](nodes/conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](nodes/dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`devcontainer/`](nodes/devcontainer/index.md) for more information on devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer.
- Load [`git/`](nodes/git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](nodes/release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and skill-artifact force-adding.
- Load [`serve/`](nodes/serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](nodes/skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](nodes/testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](nodes/tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](nodes/web/index.md) for more information on Web.

## Conventions (how we build)
- Open [**Never hand-commit generated skill artifacts; they cannot be gitignored**](nodes/practice-never-hand-commit-generated-skill-artifacts.md) to learn about: SKILL.md and .cjs bundles are build output force-added by CI, so .gitattributes and a pre-commit guard cover them and the review gate skips them. #build #skills #git #gitattributes #review-gate #generated-artifacts
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](nodes/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) to learn about: init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff. #code-review #gitignore #workspace #init #generated-artifacts
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](nodes/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) to learn about: Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior. #gitignore #workspace #documentation #code-review #init
