---
type: practice
title: 'Design thesis: configuration is Markdown, guarantees are compiled'
description: >-
  Hooks and templates are editable Markdown. Rules a user must not loosen live
  in TypeScript.
tags:
  - design-thesis
  - enforcement
kk_schema_version: 3
kk_id: practice-design-thesis-markdown-is-negotiable-guarantees-are-compiled
kk_derived_from: []
kk_relates_to:
  - practice-uncertified-review-is-never-reported-clean
  - practice-review-gate-reports-it-does-not-fix
kk_depends_on: []
kk_confidence: high
---
An agent's success report is a claim, a reviewing agent is no more reliable, and the user's attention is the scarce resource. So hooks, templates and project context are user-editable Markdown, and guarantees are compiled. Two examples: an uncertified review is never reported as clean, and reviewer and implementer run on different harnesses.

When you add enforcement, put anything a user must not loosen in TypeScript. A bound a hook can raise is not a bound. Optimize time-to-merge, not time-to-first-draft. The user-facing version is `docs/why.md`.
