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
The `vercel-labs/skills` installer scans a root `skills/` directory first, then per-harness directories (`.agents/skills/`, `.claude/skills/`, etc.), then `.claude-plugin/plugin.json`, keeping the first skill found per name. The root `skills/` release mirror is therefore the authoritative public source. But that precedence is an upstream implementation detail: committed local installation copies would become a second, possibly incomplete skill source the moment it changes (locally installed copies have historically shipped `SKILL.md` without `scripts/`), so they stay out of version control as defense in depth.

Both `.agents/skills/` and `skills-lock.json` must be listed in `.gitignore` and never tracked; they are per-machine state produced by running `npx skills add` in this repository.
