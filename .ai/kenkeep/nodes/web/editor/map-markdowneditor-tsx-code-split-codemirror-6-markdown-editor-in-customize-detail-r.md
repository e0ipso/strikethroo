---
type: map
title: >-
  MarkdownEditor.tsx — code-split CodeMirror 6 markdown editor in Customize
  detail route
description: >-
  src/web/customize/MarkdownEditor.tsx is a React.lazy-wrapped CodeMirror 6
  editor with @codemirror/language-data for lazy fenced-code-block highlighting.
tags:
  - codemirror
  - spa
  - customize
  - editor
kk_schema_version: 3
kk_id: >-
  map-markdowneditor-tsx-code-split-codemirror-6-markdown-editor-in-customize-detail-r
kk_derived_from: []
kk_relates_to:
  - >-
    practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily
kk_depends_on: []
kk_confidence: high
---
`src/web/customize/MarkdownEditor.tsx` is the CodeMirror 6 markdown editor used on the Customize detail route (`/customize/:kind/:id`). It uses `markdown({ codeLanguages: languages })` from `@codemirror/language-data` to enable nested language highlighting in fenced code blocks.

The editor and all its dependencies are code-split via a single `React.lazy` + dynamic `import()` so they never appear in the listing bundle. Theme-aware: applies `oneDark` when the resolved scheme is `dark`.

<!-- kk:related:start -->
# Related

- Related: [practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily](/web/editor/practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily.md)
<!-- kk:related:end -->
