---
type: practice
title: Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge
description: >-
  t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker
  default bridge can reach it without auth.
tags:
  - devcontainer
  - docker
  - security
  - t3
kk_schema_version: 3
kk_id: >-
  practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge
kk_derived_from:
  - '05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:1'
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
Don't disable the t3 pairing token even though the devcontainer publishes only to host loopback (`127.0.0.1:<port>`). Inside the container, `t3 serve --host 0.0.0.0` listens on all interfaces including the Docker default bridge IP (`172.17.x.x`). Sibling devcontainers on the same bridge can reach this endpoint directly, bypassing the host loopback restriction.

An unauthenticated t3 instance lets a sibling container drive agent sessions and access credentials that are bind-mounted into the sandbox — undermining the isolation the devcontainer sandbox provides.

If pairing friction is the concern, pair once and let the session persist in the `t3code-home` Docker volume. To eliminate bridge reachability, put each devcontainer on its own user-defined docker network rather than removing auth.

<!-- kk:citations:start -->
# Citations

[1] [05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:1](05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:1)
<!-- kk:citations:end -->
