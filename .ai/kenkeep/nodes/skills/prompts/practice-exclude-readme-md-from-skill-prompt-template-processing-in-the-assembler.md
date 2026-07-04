---
type: practice
title: Exclude README.md from skill-prompt template processing in the assembler
description: >-
  The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid
  treating it as a source template and failing the build.
tags:
  - build
  - skill-prompts
  - assembler
kk_schema_version: 3
kk_id: >-
  practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
When `scripts/build-skill-prompts.cjs` scans `src/skill-prompts/` for source templates, it picks up any `.md` file in that directory. `README.md` lacks the required `name`/`description` frontmatter and has no `## Operating Procedure` heading, causing the post-build validation assertions to fail.

The assembler must filter out `README.md` (and any other non-template markdown files) before processing.
