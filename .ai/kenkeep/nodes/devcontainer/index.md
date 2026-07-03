---
schema_version: 2
nodes_hash: 'sha256:38f23763b3e8873d4b61b7feec6d6c8ec867c922f84de82a83d6eea9f883c4c5'
node_count: 3
summary: >-
  devcontainer environment and t3 agent sandbox setup — Docker networking, port
  configuration, and t3 desktop connection; read when configuring or
  troubleshooting the devcontainer
---
# kenkeep Index: devcontainer

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it**](practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it.md) to learn about: t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish forwards to eth0, not container loopback. #devcontainer #docker #t3 #networking
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) to learn about: t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth. #devcontainer #docker #security #t3

## Components (what exists)
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) to learn about: Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only. #devcontainer #t3 #docker #workflow

## By topic

### #devcontainer
- Open [**Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it**](practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it.md) — t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish forwards to eth0, not container loopback.
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) — Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only.
### #docker
- Open [**Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it**](practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it.md) — t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish forwards to eth0, not container loopback.
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) — Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only.
### #t3
- Open [**Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it**](practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it.md) — t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish forwards to eth0, not container loopback.
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) — Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only.
### #networking
- Open [**Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it**](practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it.md) — t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish forwards to eth0, not container loopback.
### #security
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](../serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #workflow
- Open [**Author social and carousel assets with Dalia brand rules**](../web/branding/practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) — Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only.
