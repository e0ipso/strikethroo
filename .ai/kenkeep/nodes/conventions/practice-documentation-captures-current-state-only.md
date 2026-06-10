---
schema_version: 2
id: practice-documentation-captures-current-state-only
title: Documentation captures current state only
kind: practice
tags:
  - documentation
  - conventions
derived_from: []
relates_to: []
confidence: high
summary: >-
  All docs describe how things work now. No historical context, migration notes,
  or retired-term mappings.
---
All documentation in this project — KB nodes, docs/ pages, AGENTS.md, templates — describes how things work right now. Historical context (what used to be, why it changed, what was renamed) does not belong.

If something is renamed or removed, update or delete the documentation. Do not add "previously known as" notes, retired-term mappings, or migration-era explanations. The only exception is migration.md, which exists to help 1.x users upgrade.
