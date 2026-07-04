---
type: practice
title: Avoid */ inside @theme CSS comments to prevent premature comment termination
description: >-
  A comment containing */ inside a Tailwind @theme block terminates the comment
  early, producing a cryptic parse error that halts the build.
tags:
  - tailwind
  - css
  - comments
  - build
kk_schema_version: 3
kk_id: >-
  practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
Tailwind's `@theme` block is parsed by the `@tailwindcss/vite` plugin's own CSS parser. A `/* … */` comment that contains the literal `*/` characters — such as `border-*/ring-*/divide-*` — will terminate the comment early, treating the remaining text as CSS and failing the build with a "Missing opening (" parse error.

Reword any comment inside `@theme` blocks to avoid `*/`. For example, replace `(so border-*/ring-*/divide-* resolve)` with `(so border, ring, and divide utilities resolve)`.
