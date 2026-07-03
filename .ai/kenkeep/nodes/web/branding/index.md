---
schema_version: 2
nodes_hash: 'sha256:9d2f800c1dd8cce5b705325a5108fd8a62247069525e417069c5df6bf917a32e'
node_count: 3
summary: >-
  the strikethroo brand favicon and the font-glyph-extraction technique behind
  it
---
# kenkeep Index: web / branding

↑ Parent: [web](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) to learn about: Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only. #web #assets #favicon #brand #font #svg
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) to learn about: Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component. #brand #social #design #assets #playwright #workflow
- Open [**Use the throughline strikethroo wordmark**](practice-use-the-throughline-strikethroo-wordmark.md) to learn about: Use the Outfit throughline wordmark with an ink strike through the x-height; not the Dalia UI Wordmark or a dot. #brand #wordmark #social

## Components (what exists)
_None yet._

## By topic

### #brand
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
- Open [**Use the throughline strikethroo wordmark**](practice-use-the-throughline-strikethroo-wordmark.md) — Use the Outfit throughline wordmark with an ink strike through the x-height; not the Dalia UI Wordmark or a dot.
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) — Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only.
### #assets
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) — Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only.
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
### #social
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
- Open [**Use the throughline strikethroo wordmark**](practice-use-the-throughline-strikethroo-wordmark.md) — Use the Outfit throughline wordmark with an ink strike through the x-height; not the Dalia UI Wordmark or a dot.
### #design
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #favicon
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) — Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only.
### #font
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) — Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only.
### #playwright
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](../../testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](../../capture/practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](../../testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
### #svg
- Open [**Strikethroo brand favicon at src/web/public/favicon.svg**](practice-strikethroo-brand-favicon-svg.md) — Cream Outfit \`s\` on ink rounded-square with strike-through; embed real glyph paths and hex colors only.
### #web
- Open [**Serve SPA is read-only; archive is the only workspace mutation (self-review writes nothing)**](../../serve/practice-serve-layer-mutation-invariant-archive-endpoint-is-the-only-route-that-writes-workspace-files.md) — The serve SPA is read-only except archive: POST /api/plans/:id/archive moves done plans to archive/. Self-review spawns a process but writes no files.
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**serve UI PRD and tickets live under .ai/strikethroo/scratch/ui/**](../../serve/map-serve-ui-prd-and-tickets-live-under-ai-strikethroo-scratch-ui.md) — The PRD and 13 dependency-ordered tickets for the serve SPA feature are in .ai/strikethroo/scratch/ui/, not in the formal plans/ flow.
### #wordmark
- Open [**Use the throughline strikethroo wordmark**](practice-use-the-throughline-strikethroo-wordmark.md) — Use the Outfit throughline wordmark with an ink strike through the x-height; not the Dalia UI Wordmark or a dot.
### #workflow
- Open [**Author social and carousel assets with Dalia brand rules**](practice-use-dalia-brand-rules-for-social-carousel-assets.md) — Social assets use Dalia tokens, Fraunces/Outfit, Lucide icons, and HTML + Playwright screenshots — not Mermaid or the Dalia Wordmark component.
- Open [**t3-serve.sh + new-devcontainer — stable devcontainer-to-t3-desktop workflow**](../../devcontainer/map-t3-serve-sh-new-devcontainer-stable-devcontainer-to-t3-desktop-workflow.md) — Two tools connect t3 desktop to a devcontainer: new-devcontainer bakes a deterministic port; t3-serve.sh is exec-only.
