---
schema_version: 2
nodes_hash: 'sha256:782a72e64ccb3682ed17dc6d8e948e3179547affa8fff09e4f3987ce68d67af7'
node_count: 2
summary: >-
  the documentation-visual capture harness — its committed fixture workspace and
  Playwright SPA-driving technique
---
# kenkeep Index: capture

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) to learn about: The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead. #capture #playwright #sse #testing

## Components (what exists)
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) to learn about: src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot. #capture #fixtures #workspace #playwright

## By topic

### #capture
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**Use committed fixture workspaces, not the live gitignored .ai/strikethroo/ tree**](../testing/practice-use-committed-fixture-workspaces-not-the-live-ai-strikethroo-tree.md) — Capture, integration, and e2e must use committed fixture workspaces — not the live gitignored .ai/strikethroo/ tree that breaks CI and capture determinism.
### #playwright
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](../testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](../testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
### #fixtures
- Open [**Use committed fixture workspaces, not the live gitignored .ai/strikethroo/ tree**](../testing/practice-use-committed-fixture-workspaces-not-the-live-ai-strikethroo-tree.md) — Capture, integration, and e2e must use committed fixture workspaces — not the live gitignored .ai/strikethroo/ tree that breaks CI and capture determinism.
- Open [**src/__tests__/fixtures/serve-workspace/ — committed fixture workspace for tests**](../testing/map-src-tests-fixtures-serve-workspace-committed-fixture-workspace-for-tests.md) — Committed fixture workspace at src/__tests__/fixtures/serve-workspace/ is the hermetic replacement for the gitignored live .ai/strikethroo/ in all integration and e2e suites.
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.
### #sse
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](../testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
### #testing
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](../testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](../testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
- Open [**E2e tests must use stable semantic selectors, not Tailwind utility class names**](../testing/practice-e2e-tests-must-use-stable-semantic-selectors-not-tailwind-utility-class-names.md) — Playwright e2e assertions must target role, text, aria-*, or data-testid — never Tailwind utility class names, which change during styling iterations.
### #workspace
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](../git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.
