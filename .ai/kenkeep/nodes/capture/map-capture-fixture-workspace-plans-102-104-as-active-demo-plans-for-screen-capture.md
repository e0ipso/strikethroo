---
type: map
title: >-
  Capture fixture workspace: plans 102–104 as active demo plans for screen
  capture
description: >-
  src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans;
  plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph
  screenshot.
tags:
  - capture
  - fixtures
  - workspace
  - playwright
kk_schema_version: 3
kk_id: >-
  map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: medium
---
The Playwright capture harness (`src/capture/capture-web.ts`) drives a committed fixture workspace at `src/capture/fixtures/capture-workspace/`. Active plans:
- Plan 102: 6 tasks, 4 phases, all pending (for swimlanes/graph screenshot)
- Plan 103: 4 tasks, 2 phases, 2 done (for strikethrough state — primary rich plan for Plan/Tasks/Task-detail stills)
- Plan 104: plan-only, no tasks (renders the task-less state)

The fixture also contains archived plans across distinct months for Archive table grouping. These are demo content authored specifically for capture.
