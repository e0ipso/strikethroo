---
type: map
title: >-
  Skill-prompt build system — src/skill-prompts/ source, assembler, shared
  sections
description: >-
  src/skill-prompts/ templates + sections/ are authored source;
  build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}}
  and {{variable}}.
tags:
  - build
  - skill-prompts
  - source-of-truth
  - assembler
  - sections
kk_schema_version: 3
kk_id: map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The source templates under `src/skill-prompts/` use `{{include sections/<name>.md}}` directives and `{{variable}}` substitution resolved from per-template YAML frontmatter `vars`. Shared sections live in `src/skill-prompts/sections/`. Assembled `SKILL.md` files are build output written to `templates/harness/skills/*/SKILL.md`.

The assembler at `scripts/build-skill-prompts.cjs` is a standalone CommonJS Node.js script with no external dependencies. It performs: (1) lightweight YAML frontmatter parsing for `name`, `description`, `target`, and `vars`; (2) recursive `{{include sections/foo.md}}` resolution with cycle detection, max depth 3; (3) `{{variable}}` substitution from the `vars` map after include resolution; (4) post-assembly validation asserting presence of `## Operating Procedure` heading and no unresolved `{{...}}` directives outside fenced code blocks. Invoked as `npm run build:skill-prompts`, chained after TypeScript compile in `npm run build`.

The `README.md` in `src/skill-prompts/` is explicitly excluded from template processing. Source templates carry `name`, `description`, `target`, and `vars` in their frontmatter; the assembler strips `target` and `vars` from the output.

Nine shared section files cover the main cross-skill duplications: `root-discovery.md` (all 6 templates), `plan-resolution.md` (generate-tasks, refine-plan, execute-blueprint, execute-task), `task-minimization.md` (generate-tasks, full-workflow), `granularity-skill-rules.md` (generate-tasks, full-workflow), `test-philosophy.md` (generate-tasks, full-workflow), `task-file-output.md` (generate-tasks, full-workflow), `validation-checklist.md` (generate-tasks, full-workflow), `phase-execution-loop.md` (execute-blueprint, full-workflow), `post-execution-archive.md` (execute-blueprint, full-workflow). Variables `heading`, `heading_parent`, `phase_step`, `summary_step`, and `archive_step` handle structural differences between `execute-blueprint` and `full-workflow`.
