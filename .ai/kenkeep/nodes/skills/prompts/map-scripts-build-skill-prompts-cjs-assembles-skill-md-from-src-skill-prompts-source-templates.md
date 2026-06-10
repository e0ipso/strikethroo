---
schema_version: 2
id: >-
  map-scripts-build-skill-prompts-cjs-assembles-skill-md-from-src-skill-prompts-source-templates
title: >-
  scripts/build-skill-prompts.cjs assembles SKILL.md from src/skill-prompts/
  source templates
kind: map
tags:
  - build
  - skill-prompts
  - assembler
  - scripts
derived_from: []
relates_to: []
confidence: high
summary: >-
  Standalone Node.js CommonJS script; resolves {{include}} directives
  recursively and {{variable}} substitutions, validates output, writes to
  templates/harness/skills/*/SKILL.md.
---
The assembler at `scripts/build-skill-prompts.cjs` is a standalone CommonJS Node.js script with no external dependencies. It performs: (1) lightweight YAML frontmatter parsing for `name`, `description`, `target`, and `vars`; (2) recursive `{{include sections/foo.md}}` resolution with cycle detection, max depth 3; (3) `{{variable}}` substitution from the `vars` map after include resolution; (4) post-assembly validation asserting presence of `## Operating Procedure` heading, no unresolved `{{...}}` directives outside fenced code blocks.

Output `SKILL.md` files are written to `templates/harness/skills/<skill>/SKILL.md`. Invoked as `npm run build:skill-prompts`, chained after TypeScript compile in `npm run build`.
