---
type: practice
title: Phase is reserved for execution blueprint task groups
description: >-
  "Phase" means parallel task batches in the blueprint. The three workflow
  stages are "steps", never "phases".
tags:
  - terminology
  - documentation
  - execution-blueprint
kk_schema_version: 3
kk_id: practice-phase-reserved-for-blueprint-task-groups
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---
"Phase" has a precise technical meaning in this project: a group of tasks within an execution blueprint that execute in parallel. Phases run in sequence; tasks within a phase run concurrently.

The three workflow stages (planning, task generation, execution) are called "steps." Using "Phase 1/2/3" for these stages creates a terminology collision with the blueprint concept and confuses both human readers and LLM agents.

In documentation, AGENTS.md, and skill definitions: use "step" or the named stage (Planning, Task Generation, Execution) when referring to the workflow. Reserve "phase" exclusively for blueprint task groups.
