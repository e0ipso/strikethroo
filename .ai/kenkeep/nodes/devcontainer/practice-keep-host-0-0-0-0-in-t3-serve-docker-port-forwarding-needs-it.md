---
type: practice
title: Keep --host 0.0.0.0 in t3 serve — Docker port forwarding needs it
description: >-
  t3 serve inside the devcontainer must bind 0.0.0.0; Docker port publish
  forwards to eth0, not container loopback.
tags:
  - devcontainer
  - docker
  - t3
  - networking
kk_schema_version: 3
kk_id: practice-keep-host-0-0-0-0-in-t3-serve-docker-port-forwarding-needs-it
kk_derived_from:
  - '05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:0'
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
Inside the devcontainer, `t3 serve` must include `--host 0.0.0.0`. Docker's port publishing mechanism forwards traffic to the container's `eth0` interface, not its loopback (`127.0.0.1`). If `t3 serve` binds only `127.0.0.1` inside the container, forwarded traffic arrives on `eth0` and hits nothing — connection refused, even though `docker ps --format '{{.Ports}}'` shows the mapping as active.

The working invocation: `t3 serve --host 0.0.0.0 --mode web --no-browser`.

<!-- kk:citations:start -->
# Citations

[1] [05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:0](05a1bddf-ef9e-4147-8e07-0b971366c7d7:practice:0)
<!-- kk:citations:end -->
