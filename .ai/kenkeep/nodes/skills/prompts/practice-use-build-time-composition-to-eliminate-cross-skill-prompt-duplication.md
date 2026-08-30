---
type: practice
title: Use build-time composition to eliminate cross-skill prompt duplication
description: >-
  Shared procedural blocks in SKILL.md files must live as Handlebars partials
  under src/skill-prompts/_partials/, not copy-pasted per skill.
tags:
  - build
  - skill-prompts
  - architecture
kk_schema_version: 3
kk_id: >-
  practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
A large share of the SKILL.md corpus is shared procedure (root discovery, plan resolution, test philosophy, phase execution loop, etc.). Rather than maintaining these in sync manually across seven skills, the canonical text lives once as Handlebars partials under `src/skill-prompts/_partials/`, referenced from each skill's `SKILL.md.hbs`; values differ via hash arguments and behavior differs via block-partial slots.

The build step (`scripts/build-skill-prompts.cjs`) compiles `src/skill-prompts/skills/<name>/SKILL.md.hbs` and writes assembled `SKILL.md` files to `templates/harness/skills/<name>/` — gitignored, untracked build output. The Git-tree channel serves the tracked root `skills/` release mirror instead, refreshed only by the release workflow's sync step.

The biggest win is eliminating drift risk: a change to the phase execution loop updates all consumers in one edit.
