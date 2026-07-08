---
type: map
title: Installed skills in .claude/skills/ are decoupled from repo builds
description: >-
  Skills installed via npx skills add are separate from repo-built artifacts; a
  rebuild does not update the installed copies. Restart required after
  reinstall.
tags:
  - skills
  - installation
  - harness
kk_schema_version: 3
kk_id: map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds
kk_derived_from: []
kk_relates_to:
  - map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json
kk_depends_on: []
kk_confidence: high
---
The skills installed under `~/.claude/skills/` (or `/workspace/.claude/skills/`) are independent copies placed by the `npx skills add` installer. Rebuilding the repo does not update them. To get new or renamed skills active: (1) wait for a tagged release, (2) run `npx skills add e0ipso/strikethroo`, and (3) restart the Claude Code session so the harness re-reads the installed skills directory.

<!-- kk:related:start -->
# Related

- Related: [map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json](/release/map-vercel-labs-skills-installer-scans-standard-dirs-before-plugin-json.md)
<!-- kk:related:end -->
