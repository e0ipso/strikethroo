---
schema_version: 1
id: practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
title: Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore
kind: practice
tags:
  - git
  - gitignore
  - workspace
derived_from: []
relates_to: []
confidence: high
summary: >-
  The /.ai/strikethroo path must stay in .gitignore to prevent accidentally
  committing dogfood workspace state.
---
A `.gitignore` rewrite accidentally removed the `/.ai/task-manager` (now `/.ai/strikethroo`) entry, causing 528 dogfood workspace files to be staged. When editing `.gitignore`, always verify that the local dogfood workspace path (`.ai/strikethroo`) remains explicitly excluded to prevent accidental commit of workspace state.
