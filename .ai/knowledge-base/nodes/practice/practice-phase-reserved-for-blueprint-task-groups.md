---
schema_version: 1
id: practice-phase-reserved-for-blueprint-task-groups
title: Phase is reserved for execution blueprint task groups
kind: practice
tags:
  - terminology
  - documentation
  - execution-blueprint
derived_from: []
relates_to: []
confidence: high
summary: >-
  "Phase" means parallel task batches in the blueprint. The three workflow
  stages are "steps", never "phases".
---
"Phase" has a precise technical meaning in this project: a group of tasks within an execution blueprint that execute in parallel. Phases run in sequence; tasks within a phase run concurrently.

The three workflow stages (planning, task generation, execution) are called "steps." Using "Phase 1/2/3" for these stages creates a terminology collision with the blueprint concept and confuses both human readers and LLM agents.

In documentation, AGENTS.md, and skill definitions: use "step" or the named stage (Planning, Task Generation, Execution) when referring to the workflow. Reserve "phase" exclusively for blueprint task groups.
