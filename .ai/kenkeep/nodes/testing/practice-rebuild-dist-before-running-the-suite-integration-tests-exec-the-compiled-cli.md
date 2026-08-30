---
type: practice
title: >-
  Rebuild dist/ before running the suite — integration tests exec the compiled
  CLI
description: >-
  cli.integration.test.ts shells out to dist/cli.js, so a stale dist/ makes the
  suite fail against source that is already correct.
tags:
  - testing
  - build
  - dist
  - integration-tests
  - cli
kk_schema_version: 3
kk_id: >-
  practice-rebuild-dist-before-running-the-suite-integration-tests-exec-the-compiled-cli
kk_derived_from:
  - 'dd3c135d-8ffc-4046-97c1-60fbf493ff03:practice:0'
kk_relates_to:
  - practice-after-a-git-merge-always-rebuild-dist-web-before-running-e2e-tests
  - practice-never-hand-commit-generated-skill-artifacts
kk_depends_on: []
kk_confidence: high
---
The CLI integration suite does not import the CLI — `src/__tests__/cli.integration.test.ts` resolves `cliPath` to `dist/cli.js` and `execSync`s it. The tests therefore exercise the last compiled binary, not the working tree.

When `dist/` predates a source change, the suite reports failures whose entire cause is the stale build, and no source edit will fix them. The failures look like genuine defects: assertions on freshly implemented behavior that the source plainly satisfies.

Run `npm run build` before `npm test`, and before trusting a pre-commit gate failure. When an integration test fails on behavior the source clearly implements, check whether `dist/cli.js` predates the source change before investigating the implementation.

The rebuild writes `dist/`, `dist-web/`, and `templates/harness/skills/`, all of which are ignored local output. It does not update the tracked root `skills/` release mirror. A normal local build should therefore leave tracked files clean.

<!-- kk:related:start -->
# Related

- Related: [practice-after-a-git-merge-always-rebuild-dist-web-before-running-e2e-tests](/testing/practice-after-a-git-merge-always-rebuild-dist-web-before-running-e2e-tests.md)
- Related: [practice-never-hand-commit-generated-skill-artifacts](/practice-never-hand-commit-generated-skill-artifacts.md)
<!-- kk:related:end -->

<!-- kk:citations:start -->
# Citations

[1] [dd3c135d-8ffc-4046-97c1-60fbf493ff03:practice:0](dd3c135d-8ffc-4046-97c1-60fbf493ff03:practice:0)
<!-- kk:citations:end -->
