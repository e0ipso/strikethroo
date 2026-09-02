---
type: practice
title: Strikethroo profile packages tolerate inert package-root extras
description: >-
  validateProfilePackage scopes to profile.yaml plus config/; entries at the
  package root are accepted and are never copied, hash-tracked, or executed.
tags:
  - profiles
  - init
  - validation
  - security
kk_schema_version: 3
kk_id: practice-strikethroo-profile-packages-tolerate-inert-package-root-extras
kk_derived_from:
  - '67ec33eb-6c26-4c0a-8c3f-e117dc130acf:practice:0'
kk_relates_to:
  - practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace
kk_depends_on: []
kk_confidence: high
---
A strikethroo profile package is validated only over its manifest (`profile.yaml`) and its `config/` subtree. Entries at the package root beyond those two — `README.md`, `LICENSE`, `.git`, even a `postinstall.js` — are accepted, and the import succeeds.

The tolerance is deliberate, not a gap in `validateProfilePackage`. Remote import is a primary capability, and a git-hosted profile inevitably carries repository furniture at its root; rejecting root extras would break every remote profile. The safety property is met by construction rather than by rejection: staging overlays only the profile's `config/` onto the shipped template tree, so nothing at the package root is ever copied into the workspace, recorded in `.init-metadata.json`, or executed. A workspace `README.md` always comes from the shipped tree and cannot be displaced by a profile's own.

Do not "fix" this by widening validation to the package root. The inertness is asserted by an integration test in `src/__tests__/profiles.integration.test.ts` (a profile carrying `postinstall.js` and `README.md` imports cleanly, `postinstall.js` appears nowhere in the destination, and the workspace `README.md` is the shipped one), so a change that starts copying package-root content fails the suite rather than silently widening the trust surface.

Note that a strikethroo profile is a setup package imported at `init`, distinct from `execution_routing.profiles` in `config/config.yaml`, which are task-routing execution profiles selected at dispatch time.

<!-- kk:citations:start -->
# Citations

[1] [67ec33eb-6c26-4c0a-8c3f-e117dc130acf:practice:0](67ec33eb-6c26-4c0a-8c3f-e117dc130acf:practice:0)
<!-- kk:citations:end -->

<!-- kk:related:start -->
# Related

- Related: [practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace](/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md)
<!-- kk:related:end -->
