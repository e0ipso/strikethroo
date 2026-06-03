---
schema_version: 1
id: >-
  practice-always-dark-surfaces-need-explicit-dark-mode-color-fixups-when-using-dual-purpos
title: >-
  Always-dark surfaces need explicit dark-mode color fixups when using
  dual-purpose tokens
kind: practice
tags:
  - dark-mode
  - css
  - tokens
  - theming
derived_from: []
relates_to:
  - >-
    practice-vendoring-dalia-css-requires-the-foundational-dark-token-block-not-just-per-component-fixups
confidence: high
summary: >-
  Tokens like --cream that flip in .dark break text on always-dark backgrounds.
  Add a scoped dark-mode rule to re-light them with --ink.
---
The project uses a `.dark` token-swap in `tokens.css` that redefines `--cream` to a dark value (it doubles as the page-surface token). Any component that uses `color: var(--cream)` on an always-dark background (e.g. terminal/code blocks with `background: var(--deep)`) produces dark-text-on-dark-background in dark mode.

Fix pattern: add a scoped rule in the dark-mode fixup section:
```css
.dark .your-always-dark-component {
  color: var(--ink); /* --ink is light in dark mode */
}
```

The `--deep` background stays the same in both themes; only the text token needs the fixup. Tokens with dual semantic meaning (surface AND text) are the risk vector — verify what a token resolves to in the `.dark` block before using it as text color on a fixed-dark surface.
