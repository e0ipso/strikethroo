# kenkeep Index: profiles

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) to learn about: validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed. #profiles #init #validation #security

## Components (what exists)
_None yet._

## By topic

### #init
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](../practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](../practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
### #profiles
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
### #security
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](../devcontainer/practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](../serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #validation
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.