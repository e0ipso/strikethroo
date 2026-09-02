---
schema_version: 3
nodes_hash: 'sha256:92d500e1ba5f3bf0c36de5d4d1efb97615fd03e583d46a1b411f120ce0c8073e'
node_count: 85
---
# kenkeep

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Branches
- Load [`capture/`](nodes/capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`code-review/`](nodes/code-review/index.md) for more information on the report-only code review gate — reviewer discovery and dispatch, the stdout delivery channel, XSD certification, and cumulative-diff scoping.
- Load [`conventions/`](nodes/conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](nodes/dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`devcontainer/`](nodes/devcontainer/index.md) for more information on devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer.
- Load [`git/`](nodes/git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](nodes/release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and the root skills/ release mirror with its release-only sync.
- Load [`serve/`](nodes/serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](nodes/skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](nodes/testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](nodes/tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](nodes/web/index.md) for more information on the React + Vite + Tailwind SPA — data layer, screens, routing, and the branding, editor, rendering, styling, and ui subareas.

## Conventions (how we build)
- Open [**Never hand-commit generated skill artifacts in either tree**](nodes/practice-never-hand-commit-generated-skill-artifacts.md) to learn about: templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them. #build #skills #git #gitattributes #review-gate #generated-artifacts
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](nodes/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) to learn about: init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff. #code-review #gitignore #workspace #init #generated-artifacts
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](nodes/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) to learn about: Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output. #gitignore #workspace #documentation #code-review #init
- Open [**Strikethroo profile packages tolerate inert package-root extras**](nodes/practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) to learn about: validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed. #profiles #init #validation #security
