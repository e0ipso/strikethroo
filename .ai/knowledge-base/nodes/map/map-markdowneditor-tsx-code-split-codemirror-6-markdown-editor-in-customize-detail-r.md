---
schema_version: 1
id: >-
  map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r
title: >-
  MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize
  detail route
kind: map
tags:
  - codemirror
  - spa
  - customize
  - editor
derived_from: []
relates_to: []
confidence: high
summary: >-
  src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6
  editor with @codemirror/language-data for lazy fenced-code-block highlighting.
---
`src/web/customize/MarkdownEditor.tsx` is the CodeMirror 6 markdown editor used on the Customize detail route (`/customize/:kind/:id`). It uses `markdown({ codeLanguages: languages })` from `@codemirror/language-data` to enable nested language highlighting in fenced code blocks.

The editor and all its dependencies are code-split via a single `React.lazy` + dynamic `import()` so they never appear in the listing bundle. Theme-aware: applies `oneDark` when the resolved scheme is `dark`.
