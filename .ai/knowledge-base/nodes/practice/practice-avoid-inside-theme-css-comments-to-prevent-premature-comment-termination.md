---
schema_version: 1
id: >-
  practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination
title: Avoid */ inside @theme CSS comments to prevent premature comment termination
kind: practice
tags:
  - tailwind
  - css
  - comments
  - build
derived_from: []
relates_to: []
confidence: high
summary: >-
  A comment containing */ inside a Tailwind @theme block terminates the comment
  early, producing a cryptic parse error that halts the build.
---
Tailwind's `@theme` block is parsed by the `@tailwindcss/vite` plugin's own CSS parser. A `/* … */` comment that contains the literal `*/` characters — such as `border-*/ring-*/divide-*` — will terminate the comment early, treating the remaining text as CSS and failing the build with a "Missing opening (" parse error.

Reword any comment inside `@theme` blocks to avoid `*/`. For example, replace `(so border-*/ring-*/divide-* resolve)` with `(so border, ring, and divide utilities resolve)`.
