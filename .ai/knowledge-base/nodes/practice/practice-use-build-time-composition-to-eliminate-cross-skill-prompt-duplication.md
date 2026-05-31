---
schema_version: 1
id: >-
  practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication
title: Use build-time composition to eliminate cross-skill prompt duplication
kind: practice
tags:
  - build
  - skill-prompts
  - architecture
derived_from: []
relates_to: []
confidence: high
summary: >-
  Shared procedural blocks in SKILL.md files must live as include-resolved
  sections under src/skill-prompts/sections/, not copy-pasted per skill.
---
Approximately 60–70% of the total SKILL.md corpus is duplicated text (root discovery, plan resolution, test philosophy, phase execution loop, etc.). Rather than maintaining these in sync manually across 6 files, the canonical text lives once under `src/skill-prompts/sections/` and is assembled at build time via `{{include sections/<name>.md}}` directives.

The build step reads source templates from `src/skill-prompts/`, resolves include directives recursively, substitutes `{{variable}}` placeholders from per-template frontmatter `vars`, and writes assembled `SKILL.md` files to `templates/harness/skills/*/`. Generated `SKILL.md` files are git-ignored on `main` and force-added into release commits by `@semantic-release/git`.

The biggest win is eliminating drift risk: a change to the phase execution loop updates all consumers in one edit.
