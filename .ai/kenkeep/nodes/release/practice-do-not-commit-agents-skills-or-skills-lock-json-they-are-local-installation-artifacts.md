---
type: practice
title: >-
  Do not commit .agents/skills/ or skills-lock.json — they are local
  installation artifacts
description: >-
  `.agents/skills/` and `skills-lock.json` are produced by running `npx skills
  add` locally and must be gitignored, not committed.
tags:
  - distribution
  - skills
  - gitignore
kk_schema_version: 3
kk_id: >-
  practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The `vercel-labs/skills` installer scans standard directories (`.agents/skills/`, `.claude/skills/`, etc.) before consulting `plugin.json`. If `.agents/skills/` is committed, the installer finds skill copies there first — but those copies only contain `SKILL.md` with no `scripts/` subdirectory. End users receive broken skills missing their `.cjs` bundles.

The authoritative skill source is `templates/harness/skills/`, declared via `.claude-plugin/plugin.json`. Both `.agents/skills/` and `skills-lock.json` must be listed in `.gitignore` and removed from git tracking.
