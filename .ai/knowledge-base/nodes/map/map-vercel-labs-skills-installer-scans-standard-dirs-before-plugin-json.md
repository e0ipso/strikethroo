---
schema_version: 1
id: map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json
title: vercel-labs/skills installer scans standard dirs before plugin.json
kind: map
tags:
  - distribution
  - skills
  - installer
derived_from: []
relates_to: []
confidence: high
summary: >-
  The installer checks `.agents/skills/`, `.claude/skills/`, etc. in priority
  order before falling back to `.claude-plugin/plugin.json` manifest paths.
---
The `vercel-labs/skills` installer (`skills.ts` `getPluginSkillPaths`) scans standard well-known directories such as `.agents/skills/` and `.claude/skills/` before consulting `plugin.json`. If any of those directories exists and contains skill subdirectories, the installer uses those paths — it never reaches the `plugin.json`-declared paths under `templates/harness/skills/`.

For `e0ipso/strikethroo`, the installer uses the git clone path and calls `copyDirectory` recursively. Removing `.agents/skills/` from the repo forces the fallback to `plugin.json`, where `templates/harness/skills/*/` entries include both `SKILL.md` and the `scripts/` subdirectory.
