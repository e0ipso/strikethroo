---
schema_version: 1
id: >-
  practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler
title: Exclude README.md from skill-prompt template processing in the assembler
kind: practice
tags:
  - build
  - skill-prompts
  - assembler
derived_from: []
relates_to: []
confidence: high
summary: >-
  The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid
  treating it as a source template and failing the build.
---
When `scripts/build-skill-prompts.cjs` scans `src/skill-prompts/` for source templates, it picks up any `.md` file in that directory. `README.md` lacks the required `name`/`description` frontmatter and has no `## Operating Procedure` heading, causing the post-build validation assertions to fail.

The assembler must filter out `README.md` (and any other non-template markdown files) before processing.
