---
schema_version: 2
id: map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds
title: Installed skills in .claude/skills/ are decoupled from repo builds
kind: map
tags:
  - skills
  - installation
  - harness
derived_from: []
relates_to: []
confidence: high
summary: >-
  Skills installed via npx skills add are separate from repo-built artifacts; a
  rebuild does not update the installed copies. Restart required after
  reinstall.
---
The skills installed under `~/.claude/skills/` (or `/workspace/.claude/skills/`) are independent copies placed by the `npx skills add` installer. Rebuilding the repo does not update them. To get new or renamed skills active: (1) wait for a tagged release, (2) run `npx skills add e0ipso/strikethroo`, and (3) restart the Claude Code session so the harness re-reads the installed skills directory.
