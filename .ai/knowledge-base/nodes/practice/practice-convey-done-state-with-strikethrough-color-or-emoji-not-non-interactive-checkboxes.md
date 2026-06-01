---
schema_version: 1
id: >-
  practice-convey-done-state-with-strikethrough-color-or-emoji-not-non-interactive-checkboxes
title: >-
  Convey done/undone state with strikethrough, color, or emoji — never a
  non-interactive checkbox
kind: practice
tags:
  - web
  - ui
  - ux
  - accessibility
  - affordance
derived_from: []
relates_to: []
confidence: high
summary: >-
  In read-only UI, render Done/Undone with a passive visual cue (strikethrough,
  text color, emoji); a checkbox implies it is clickable
---
A checkbox is an interactive affordance: it tells the user "click me to toggle this". When a surface is read-only — like the blueprint task rows in the Plan tab (`BlueprintRail.tsx`) and the Tasks-tab Outline (`ExecOutlineView.tsx`) — a rendered checkbox is a lie. It invites a click that does nothing, which is both confusing and an accessibility defect (a control with no action).

Convey Done vs. Undone with a passive visual cue instead. The SPA's convention is **strikethrough** text for a completed task; `StatusPill` may accompany it. Text color or an emoji marker are equally valid passive cues where strikethrough does not fit. Reserve `Tickbox` strictly for surfaces where toggling actually mutates state.

Rule of thumb: if clicking the control would not change anything, do not render a control — render a state indicator.
