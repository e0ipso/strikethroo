---
schema_version: 1
id: map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content
title: src/skill-prompts/ is the authored source of truth for SKILL.md content
kind: map
tags:
  - build
  - skill-prompts
  - source-of-truth
derived_from: []
relates_to: []
confidence: high
summary: >-
  Shared procedural sections live in src/skill-prompts/sections/; per-skill
  source templates live directly in src/skill-prompts/. Assembled SKILL.md files
  are build output.
---
The source templates under `src/skill-prompts/` use `{{include sections/<name>.md}}` directives and `{{variable}}` substitution resolved from per-template YAML frontmatter `vars`. Shared sections (e.g. `root-discovery.md`, `plan-resolution.md`, `test-philosophy.md`, `phase-execution-loop.md`) live in `src/skill-prompts/sections/`. The build script `scripts/build-skill-prompts.cjs` assembles these into final `SKILL.md` files written to `templates/harness/skills/*/SKILL.md`.

The `README.md` in `src/skill-prompts/` is explicitly excluded from template processing. Source templates carry `name`, `description`, `target`, and `vars` in their frontmatter; the assembler strips `target` and `vars` from the output.
