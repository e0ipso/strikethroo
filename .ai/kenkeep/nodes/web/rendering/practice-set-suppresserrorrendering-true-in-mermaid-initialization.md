---
type: practice
title: 'Set suppressErrorRendering: true in mermaid initialization'
description: >-
  Without this flag, mermaid v11 injects an orphaned error SVG into <body> on
  parse failure even when the caller catches the error.
tags:
  - mermaid
  - spa
  - rendering
  - error-handling
kk_schema_version: 3
kk_id: practice-set-suppresserrorrendering-true-in-mermaid-initialization
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
In mermaid v11, `render()` on a parse failure builds its red "Syntax error" SVG in a temp element under `<body>` and skips `removeTempElements()` on the throw path (confirmed at `mermaid.core.mjs:1184–1212`). The React-layer `catch` block cannot undo this DOM injection, so the error graphic floats outside the layout.

Fix: set `suppressErrorRendering: true` in the mermaid initialization options (in `src/web/render/mermaid.ts`). This causes mermaid to call `removeTempElements()` before throwing, so the error is clean and the caller's error UI controls what the user sees. The flag does **not** fix or suppress the parse error itself — invalid diagrams still fail; it only suppresses mermaid's own DOM side effect.
