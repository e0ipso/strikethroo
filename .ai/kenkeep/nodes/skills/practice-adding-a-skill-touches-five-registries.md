---
type: practice
title: Adding a skill means editing five registries
description: >-
  Template, SKILL_ENTRYPOINTS, plugin.json, STRIKETHROO_WORKFLOW_SKILLS,
  EXPECTED_SKILLS. The mirror test blocks it until release.
tags:
  - skills
  - build
kk_schema_version: 3
kk_id: practice-adding-a-skill-touches-five-registries
kk_derived_from: []
kk_relates_to:
  - practice-never-hand-commit-generated-skill-artifacts
kk_depends_on: []
kk_confidence: high
---
A new skill must appear in `src/skill-prompts/skills/<name>/SKILL.md.hbs`, `SKILL_ENTRYPOINTS` in `scripts/build-skills.cjs`, `.claude-plugin/plugin.json`, `STRIKETHROO_WORKFLOW_SKILLS` in `src/update.ts`, and `EXPECTED_SKILLS` in `src/__tests__/skills-mirror.test.ts`.

The mirror test compares `plugin.json` with the release-only `skills/` tree, so the suite fails until a release writes the directory. Ask the maintainer before working around it.

<!-- kk:related:start -->
# Related

- Related: [practice-never-hand-commit-generated-skill-artifacts](../release/practice-never-hand-commit-generated-skill-artifacts.md)
<!-- kk:related:end -->
