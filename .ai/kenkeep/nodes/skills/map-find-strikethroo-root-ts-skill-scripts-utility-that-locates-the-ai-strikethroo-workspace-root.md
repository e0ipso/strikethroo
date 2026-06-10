---
schema_version: 2
id: >-
  map-find-strikethroo-root-ts-skill-scripts-utility-that-locates-the-ai-strikethroo-workspace-root
title: >-
  find-strikethroo-root.ts — skill-scripts utility that locates the
  .ai/strikethroo workspace root
kind: map
tags:
  - skill-scripts
  - workspace-root
derived_from: []
relates_to: []
confidence: high
summary: >-
  Entry point under src/skill-scripts/ that finds the .ai/strikethroo root.
  Listed in SKILL_ENTRYPOINTS in scripts/build-skills.cjs.
---
The `src/skill-scripts/` entrypoints are named after their function: `find-strikethroo-root.ts`, `check-task-dependencies.ts`, `create-feature-branch.ts`, `get-next-plan-id.ts`, `get-next-task-id.ts`, `validate-plan-blueprint.ts`. Each is bundled by `scripts/build-skills.cjs` and the bundle filename is referenced by the relevant `SKILL.md` prompts.
