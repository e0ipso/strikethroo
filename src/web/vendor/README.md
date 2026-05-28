# Vendored Dalia "Bold Editorial" Design System

This directory contains the Dalia design system vendored verbatim into this
repository. It is the **authoritative source of truth** for the SPA's styles,
self-hosted fonts, and the minimal `cn` utility.

## Provenance

- **Source:** `/tmp/dalia-ui` (the unpublished `@dalia/ui` package).
- **Commit:** `3592008`
  (`35920089956326618a11d86be509dd3910369aba`, "feat: initial commit").

## Authoritative-CSS Rule

The vendored CSS (`styles/*.css`) and font files (`styles/fonts/`) are copied
**verbatim** from upstream and are treated as the authoritative source of truth.
They are edited **only** to re-sync with upstream Dalia — never hand-modified to
patch local needs. Any local style adjustments belong in repo-authored code
outside this `vendor/` directory.

## Contents

- `styles/index.css` — canonical entry stylesheet reproducing Dalia's exact
  import order: fonts → `tailwindcss` → tokens → base → editorial → interactive
  → prose. Import this single file to load the full design system.
- `styles/tokens.css` — Tailwind v4 `@theme` design tokens.
- `styles/base.css` — base reset and typography.
- `styles/editorial.css` — Bold Editorial component styles.
- `styles/interactive.css` — interactive/overlay component styles.
- `styles/prose.css` — long-form prose styles.
- `styles/fonts.css` — `@font-face` declarations referencing the self-hosted
  font files under `styles/fonts/` (Fraunces variable + italic, Outfit variable,
  the SF Mono OTF set). All `src: url(...)` paths are local; no CDN fetch occurs.
- `styles/fonts/` — the self-hosted brand font files.
- `utils/cn.ts` — the `clsx` class-name composition helper.

### YAGNI deferral

Dalia's `useClipboard.ts` and `useReveal.ts` hooks were **not** vendored: the
current smoke app needs only `cn`. Copy them from upstream commit `3592008`
when a ticket first requires them.
