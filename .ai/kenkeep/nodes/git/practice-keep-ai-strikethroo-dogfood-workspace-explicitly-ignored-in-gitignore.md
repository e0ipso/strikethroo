---
schema_version: 2
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
The local `.ai/strikethroo` dogfood workspace must stay excluded in `.gitignore`. When editing `.gitignore`, always verify that this path remains explicitly ignored — dropping it stages hundreds of dogfood workspace files and risks committing local workspace state.
