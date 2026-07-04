---
type: practice
title: Documentation captures current state only
description: >-
  All docs describe how things work now. No historical context, migration notes,
  or retired-term mappings.
tags:
  - documentation
  - conventions
kk_schema_version: 3
kk_id: practice-documentation-captures-current-state-only
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
All documentation in this project — KB nodes, docs/ pages, AGENTS.md, templates — describes how things work right now. Historical context (what used to be, why it changed, what was renamed) does not belong.

If something is renamed or removed, update or delete the documentation. Do not add "previously known as" notes, retired-term mappings, or migration-era explanations. The only exception is migration.md, which exists to help 1.x users upgrade.
