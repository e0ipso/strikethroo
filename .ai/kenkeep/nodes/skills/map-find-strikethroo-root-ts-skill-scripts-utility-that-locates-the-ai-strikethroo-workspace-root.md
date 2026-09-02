---
type: map
title: >-
  find-strikethroo-root.ts — skill-scripts utility that locates the
  .ai/strikethroo workspace root
description: >-
  Entry point under src/skill-scripts/ that finds the .ai/strikethroo root.
  Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
tags:
  - skill-scripts
  - workspace-root
kk_schema_version: 3
kk_id: >-
  map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root
kk_derived_from: []
kk_relates_to:
  - map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content
kk_depends_on: []
kk_confidence: high
---
`find-strikethroo-root.ts` is a reusable skill-script entrypoint that locates the initialized `.ai/strikethroo` root. `scripts/build-skills.cjs` registers it for every workflow skill that needs root discovery, and esbuild emits a separate `find-strikethroo-root.cjs` bundle inside each consuming skill.

The current top-level entrypoints under `src/skill-scripts/` are:

- `capture-base-commit.ts`
- `check-phase-readiness.ts`
- `check-task-dependencies.ts`
- `code-review.ts`
- `create-feature-branch.ts`
- `dispatch-task-execution.ts`
- `find-strikethroo-root.ts`
- `get-next-plan-id.ts`
- `get-next-task-id.ts`
- `route-task-execution.ts`
- `validate-plan-blueprint.ts`

Every one appears in `SKILL_ENTRYPOINTS` in `scripts/build-skills.cjs`. The registry is many-to-many: shared entrypoints are bundled into several skills, while skill-specific entrypoints appear once.

<!-- kk:related:start -->
# Related

- Related: [map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content](/skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md)
<!-- kk:related:end -->
