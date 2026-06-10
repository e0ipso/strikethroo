---
schema_version: 2
id: >-
  practice-use-theme-token-utilities-everywhere-in-the-spa-never-arbitrary-value-brackets-f
title: >-
  Use @theme token utilities everywhere in the SPA; never arbitrary-value
  brackets for design values
kind: practice
tags:
  - tailwind
  - tokens
  - css
  - dark-mode
  - spa
derived_from: []
relates_to: []
confidence: high
summary: >-
  All SPA brand/status/signature values must be @theme-backed utilities
  (bg-cream, text-ink, etc.). Zero [oklch], [var()], or [px] bracket values for
  design tokens.
---
The SPA styling convention is utility-first Tailwind v4 with zero arbitrary-value brackets for design values. Every brand, status, and signature value is defined once in `src/web/vendor/styles/tokens.css` under `@theme` and consumed as a clean Tailwind utility:
- Palette: `bg-cream`, `text-ink`, `text-ink-3`, `text-ink-4`, `text-dalia`
- Status: `bg-doing`, `bg-done`, `text-doing`, `text-done`
- Border: `border-border`, `border-border-soft`, `border-border-strong`
- Shadows: `shadow-frame`, `shadow-frame-hover`, `shadow-modal`
- Shape: `rounded-card`
- Typography: `font-display` (Fraunces), `font-sans` (Outfit)

Dark mode works via the `.dark` token-swap block — token-backed utilities auto-flip without `dark:` variants. Use explicit `dark:` only for genuine shape differences the swap cannot express.

Never use `[oklch(...)]`, `[var(--...)]`, `[12px]`, or other value-literal brackets for design values. Selector-form brackets (`[&_li.md-task]`, `[&>svg]`) and `content-['']` are acceptable.
