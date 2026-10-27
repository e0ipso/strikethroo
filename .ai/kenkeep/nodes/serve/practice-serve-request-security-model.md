---
type: practice
title: Serve guards every request; mutations need a session token
description: >-
  guardRequest checks Host and origin. Mutations need the per-start token from
  GET /api/session.
tags:
  - serve
  - security
kk_schema_version: 3
kk_id: practice-serve-request-security-model
kk_derived_from: []
kk_relates_to:
  - >-
    practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files
kk_depends_on: []
kk_confidence: high
---
Every request passes `guardRequest` in `src/serve/server.ts`. `Host` must name an allowed authority, which is the DNS-rebinding defense. `--host` takes IP literals only, and no CORS headers are ever sent.

Mutations need the per-start token from `GET /api/session` in the capability header. Scripts must fetch it the way the SPA does. The token stops pages on other origins, not other local processes or peers on a network bind.

`serve --read-only` closes that gap for peers. `routeApi` answers every `mutation` route and the session bootstrap with `READ_ONLY` (`403`, `reason: 'read-only'`) right after the method check, before origin, capability, media type, or body. A new mutating route must set `mutation: true` so read-only mode covers it.

<!-- kk:related:start -->
# Related

- Related: [practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files](practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md)
<!-- kk:related:end -->
