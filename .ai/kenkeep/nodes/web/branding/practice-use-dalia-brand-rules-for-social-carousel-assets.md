---
type: practice
title: Author social and carousel assets with Dalia brand rules
description: >-
  Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML +
  Playwright screenshots — not Mermaid or the Dalia Wordmark component.
tags:
  - brand
  - social
  - design
  - assets
  - playwright
  - workflow
kk_schema_version: 3
kk_id: practice-use-dalia-brand-rules-for-social-carousel-assets
kk_derived_from: []
kk_relates_to:
  - >-
    map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency
  - map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles
kk_depends_on: []
kk_confidence: high
---
For Strikethroo social and carousel graphics, use the Dalia visual system: `--color-cream` is the dominant ground, `--color-dalia` / `--color-dalia-bg` are punctuation only, and text uses `--color-ink`, `--color-ink-2`, or `--color-ink-3`.

Use Fraunces (`--font-display`) and Outfit (`--font-sans`) only, with mono reserved for code or labels. Use `var(--shadow-frame)` layered shadows rather than single drop shadows. Do not use `#000` or `#fff`. Use Lucide stroke icons only, no emoji. Avoid em-dashes in visible copy.

Hand-author a fixed-size HTML/CSS card against the Dalia token system, then screenshot the target element with Playwright. For LinkedIn carousel slides, use fixed 4:5 cards such as `1080x1350`, render each slide as an image, and assemble the final carousel PDF from those rendered pages.

<!-- kk:related:start -->
# Related

- Related: [map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency](/web/styling/map-dalia-ui-design-system-vendored-into-src-web-vendor-not-a-package-dependency.md)
- Related: [map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles](/web/styling/map-spa-vendor-styles-five-retained-css-files-under-src-web-vendor-styles.md)
<!-- kk:related:end -->
