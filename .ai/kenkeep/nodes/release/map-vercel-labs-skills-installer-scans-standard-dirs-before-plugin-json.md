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
The `vercel-labs/skills` installer (`skills.ts` `getPluginSkillPaths`) scans standard well-known directories such as `.agents/skills/` and `.claude/skills/` before consulting `plugin.json`. A root `skills/` directory is searched before those, and `plugin.json` paths are appended last. Whatever it finds must be committed: the installer clones the repository, so a gitignored path such as `dist-test/` is invisible to it regardless of what `plugin.json` says.

For `e0ipso/strikethroo`, the installer uses the git clone path and calls `copyDirectory` recursively. The tracked root `skills/` directory is the discovery target; `plugin.json` points at the same `./skills/st-*` entries and is redundant for this installer.

<!-- kk:related:start -->
# Related

- Related: [practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts](/release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md)
<!-- kk:related:end -->
