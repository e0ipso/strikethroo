---
schema_version: 2
id: practice-use-baseui-components-for-interactive-ui-elements-in-the-spa
title: Use BaseUI components for interactive UI elements in the SPA
kind: practice
tags:
  - web
  - baseui
  - components
  - interactive
  - spa
derived_from: []
relates_to: []
confidence: high
summary: >-
  @base-ui-components/react is required for all new interactive UI elements;
  hand-rolled components are pre-mandate legacy.
---
All new interactive UI elements in the SPA must use `@base-ui-components/react`. The user explicitly established this as a standing requirement: "make sure to use the BaseUI components that we are required to use always."

The first usage introduced under this rule is the collapsible-rail `Toggle` in `Sidebar.tsx` (`@base-ui-components/react/toggle`). Existing hand-rolled components (`ThemeToggle`, `Modal`, `Tickbox`) predate this rule and have not yet been updated — they are legacy, not counterexamples.

When adding any new interactive control (button, toggle, dialog, tooltip, etc.), reach for the appropriate BaseUI primitive rather than authoring a custom implementation.
