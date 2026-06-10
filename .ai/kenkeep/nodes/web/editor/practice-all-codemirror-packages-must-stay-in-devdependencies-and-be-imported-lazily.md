---
schema_version: 2
id: >-
  practice-all-codemirror-packages-must-stay-in-devdependencies-and-be-imported-lazily
title: All CodeMirror packages must stay in devDependencies and be imported lazily
kind: practice
tags:
  - codemirror
  - spa
  - devdependencies
  - lazy-loading
derived_from: []
relates_to: []
confidence: high
summary: >-
  CodeMirror packages are build-time only and must never move to runtime
  dependencies. All four packages are loaded inside a single React.lazy import
  boundary.
---
The project's hard constraint: all CodeMirror packages (`@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, `@codemirror/theme-one-dark`) are build-time only and must remain `devDependencies`. They must never move to runtime `dependencies`.

All four packages are loaded exclusively inside the single `React.lazy(() => import(…))` boundary in `MarkdownEditor.tsx`. This code-splits them out of the main bundle so the listing routes never pull CodeMirror.

This matches the broader constraint that all frontend libraries (Vite, React, Tailwind, mermaid, marked, dompurify, etc.) are build-time only — `serve` ships a prebuilt static `dist-web/` bundle and uses Node built-ins only at runtime.
