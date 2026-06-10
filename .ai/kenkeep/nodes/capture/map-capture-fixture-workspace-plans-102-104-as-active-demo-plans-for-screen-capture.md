---
schema_version: 2
id: >-
  map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture
title: >-
  Capture fixture workspace: plans 102–104 as active demo plans for screen
  capture
kind: map
tags:
  - capture
  - fixtures
  - workspace
  - playwright
derived_from: []
relates_to: []
confidence: medium
summary: >-
  src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans;
  plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph
  screenshot.
---
The Playwright capture harness (`src/capture/capture-web.ts`) drives a committed fixture workspace at `src/capture/fixtures/capture-workspace/`. Active plans:
- Plan 102: 6 tasks, 4 phases, all pending (for swimlanes/graph screenshot)
- Plan 103: 4 tasks, 2 phases, 2 done (for strikethrough state — primary rich plan for Plan/Tasks/Task-detail stills)
- Plan 104: plan-only, no tasks (renders the task-less state)

The fixture also contains archived plans across distinct months for Archive table grouping. These are demo content authored specifically for capture.
