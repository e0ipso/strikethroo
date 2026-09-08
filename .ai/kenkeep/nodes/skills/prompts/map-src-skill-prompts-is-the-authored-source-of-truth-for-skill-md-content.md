---
type: map
title: >-
  Skill-prompt build system — src/skill-prompts/ Handlebars source, assembler,
  shared partials
description: >-
  src/skill-prompts/skills/<name>/SKILL.md.hbs plus _partials/ are authored
  source; build-skill-prompts.cjs compiles them with Handlebars into
  dist-test/<name>/SKILL.md.
tags:
  - build
  - skill-prompts
  - source-of-truth
  - assembler
  - handlebars
kk_schema_version: 3
kk_id: map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content
kk_derived_from: []
kk_relates_to:
  - >-
    practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication
kk_depends_on: []
kk_confidence: high
---
Each shipped `SKILL.md` is compiled from `src/skill-prompts/skills/<name>/SKILL.md.hbs`. Shared procedures live as Handlebars partials in `src/skill-prompts/_partials/` (`<name>.md.hbs`; partial names are the filename relative to `_partials/` with `.md.hbs` removed). Values are passed as hash arguments at the call site, and behavioral differences use block-partial slots. Frontmatter carries only `name` and `description`.

The assembler at `scripts/build-skill-prompts.cjs` (invoked as `npm run build:skill-prompts`, the last step of `npm run build`) registers every `_partials/` template, compiles each skill's `SKILL.md.hbs`, and writes `dist-test/<name>/SKILL.md` plus its `references/*.md`. It copies every skill-local reference and any shared `_references/*.md` named by the rendered prompt, byte for byte without Handlebars compilation. It removes obsolete output references and empty reference directories. Validation rejects unresolved markers, invalid frontmatter, missing `## Operating Procedure` headings, missing scripts or reference targets, duplicate local/shared reference names, non-flat or non-Markdown reference entries, and any non-partial file under `_partials/`. The output tree is gitignored, untracked local build output; the Git-tree channel serves the separate root `skills/` release mirror, synced only at release time.

Read `src/skill-prompts/README.md` and `src/skill-prompts/AUTHORING.md` before editing prompts. They are documentation and are outside the assembler's template and reference inputs.

<!-- kk:related:start -->
# Related

- Related: [practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication](/skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md)
<!-- kk:related:end -->
