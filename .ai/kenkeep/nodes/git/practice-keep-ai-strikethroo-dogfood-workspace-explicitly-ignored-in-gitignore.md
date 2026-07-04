---
type: practice
title: Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore
description: >-
  The /.ai/strikethroo path must stay in .gitignore to prevent accidentally
  committing dogfood workspace state.
tags:
  - git
  - gitignore
  - workspace
kk_schema_version: 3
kk_id: practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
The local `.ai/strikethroo` dogfood workspace must stay excluded in `.gitignore`. When editing `.gitignore`, always verify that this path remains explicitly ignored — dropping it stages hundreds of dogfood workspace files and risks committing local workspace state.
