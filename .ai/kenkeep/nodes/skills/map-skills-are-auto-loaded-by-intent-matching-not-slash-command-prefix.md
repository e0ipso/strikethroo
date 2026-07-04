---
type: map
title: 'Skills are auto-loaded by intent matching, not slash-command prefix'
description: >-
  Users do not type /st-create-plan; the harness matches the user's intent to
  the skill description and auto-loads it.
tags:
  - skills
  - invocation
  - harness
kk_schema_version: 3
kk_id: map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
Despite the `/` prefix convention used in shorthand documentation, strikethroo skills are not slash commands. The harness auto-loads a skill when the user's prompt matches its description (e.g. 'create a plan for X' triggers `st-create-plan`). Typing `/st-create-plan` literally is not how they are invoked.
