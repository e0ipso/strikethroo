---
schema_version: 1
id: map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix
title: 'Skills are auto-loaded by intent matching, not slash-command prefix'
kind: map
tags:
  - skills
  - invocation
  - harness
derived_from: []
relates_to: []
confidence: high
summary: >-
  Users do not type /st-create-plan; the harness matches the user's intent to
  the skill description and auto-loads it.
---
Despite the `/` prefix convention used in shorthand documentation, strikethroo skills are not slash commands. The harness auto-loads a skill when the user's prompt matches its description (e.g. 'create a plan for X' triggers `st-create-plan`). Typing `/st-create-plan` literally is not how they are invoked.
