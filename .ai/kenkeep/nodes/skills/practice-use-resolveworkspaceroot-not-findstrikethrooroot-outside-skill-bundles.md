---
type: practice
title: 'Use resolveWorkspaceRoot, not findStrikethrooRoot, outside skill bundles'
description: >-
  findStrikethrooRoot calls process.exit(1) on schema-version skew;
  resolveWorkspaceRoot returns a typed result and never exits.
tags:
  - workspace-root
  - cli
  - skill-scripts
  - serve
  - gotcha
kk_schema_version: 3
kk_id: >-
  practice-use-resolveworkspaceroot-not-findstrikethrooroot-outside-skill-bundles
kk_derived_from:
  - 'ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:0'
kk_relates_to:
  - >-
    map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root
kk_depends_on: []
kk_confidence: high
---
Two workspace-root resolvers coexist and they are not interchangeable.

`findStrikethrooRoot` (`src/skill-scripts/shared/root.ts`) compares the workspace schema version against the version esbuild baked into the bundle and calls `process.exit(1)` on skew (`root.ts:62`). That is correct for a skill bundle, which is a one-shot process whose only sane response to a version mismatch is to stop. It is fatal anywhere else: it hard-kills the host process on exactly the degraded workspace the caller is most likely trying to diagnose or repair.

`resolveWorkspaceRoot` (`src/serve/root.ts:66`) is the non-fatal path. It checks only that `.init-metadata.json` exists, performs no schema-version check at all, and returns a typed result the caller inspects with `isResolveError()` and handles itself. This is what `serve` uses.

Any CLI command, library module, or long-lived process that must survive a stale or broken workspace uses `resolveWorkspaceRoot` and handles the error locally. Reserve `findStrikethrooRoot` for code that ships inside a skill `.cjs` bundle.

<!-- kk:related:start -->
# Related

- Related: [map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root](/skills/map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:0](ecba74ac-907e-4ecc-bb2b-60c89a695f4a:practice:0)
<!-- kk:citations:end -->
