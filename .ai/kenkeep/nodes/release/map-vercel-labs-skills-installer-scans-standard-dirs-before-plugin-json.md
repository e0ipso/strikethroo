---
type: map
title: vercel-labs/skills installer scans standard dirs before plugin.json
description: >-
  The installer checks `.agents/skills/`, `.claude/skills/`, etc. in priority
  order before falling back to `.claude-plugin/plugin.json` manifest paths.
tags:
  - distribution
  - skills
  - installer
kk_schema_version: 3
kk_id: map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json
kk_derived_from: []
kk_relates_to:
  - >-
    practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts
kk_depends_on: []
kk_confidence: high
---
The `vercel-labs/skills` installer (`skills.ts` `getPluginSkillPaths`) scans standard well-known directories such as `.agents/skills/` and `.claude/skills/` before consulting `plugin.json`. If any of those directories exists and contains skill subdirectories, the installer uses those paths — it never reaches the `plugin.json`-declared paths under `templates/harness/skills/`.

For `e0ipso/strikethroo`, the installer uses the git clone path and calls `copyDirectory` recursively. Removing `.agents/skills/` from the repo forces the fallback to `plugin.json`, where `templates/harness/skills/*/` entries include both `SKILL.md` and the `scripts/` subdirectory.

<!-- kk:related:start -->
# Related

- Related: [practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts](/release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md)
<!-- kk:related:end -->
