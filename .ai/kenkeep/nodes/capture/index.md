---
schema_version: 2
nodes_hash: 'sha256:88f5626e9503a07e8f02cbca096a57db4083b7ac4b57656f18bd4c0021ad4ed6'
node_count: 3
summary: >-
  the documentation-visual capture harness — its committed fixture workspace and
  Playwright SPA-driving technique
---
# kenkeep Index: capture

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Capture harness uses a committed fixture workspace, not the live .ai/strikethroo tree**](capture/practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t.md) to learn about: The capture:web harness defaults to src/capture/fixtures/capture-workspace/ for repeatable output. Set CAPTURE_WORKSPACE env var to override. #capture #testing #fixtures #playwright #documentation
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](capture/practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) to learn about: The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead. #capture #playwright #sse #testing

## Components (what exists)
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](capture/map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) to learn about: src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot. #capture #fixtures #workspace #playwright

## By topic

### #capture
- Open [**Capture harness uses a committed fixture workspace, not the live .ai/strikethroo tree**](capture/practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t.md) — The capture:web harness defaults to src/capture/fixtures/capture-workspace/ for repeatable output. Set CAPTURE_WORKSPACE env var to override.
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](capture/map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](capture/practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
### #playwright
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](capture/practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**Capture harness uses a committed fixture workspace, not the live .ai/strikethroo tree**](capture/practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t.md) — The capture:web harness defaults to src/capture/fixtures/capture-workspace/ for repeatable output. Set CAPTURE_WORKSPACE env var to override.
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
### #fixtures
- Open [**Capture harness uses a committed fixture workspace, not the live .ai/strikethroo tree**](capture/practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t.md) — The capture:web harness defaults to src/capture/fixtures/capture-workspace/ for repeatable output. Set CAPTURE_WORKSPACE env var to override.
- Open [**src/__tests__/fixtures/serve-workspace/ — committed fixture workspace for tests**](testing/map-src-tests-fixtures-serve-workspace-committed-fixture-workspace-for-tests.md) — Committed fixture workspace at src/__tests__/fixtures/serve-workspace/ is the hermetic replacement for the gitignored live .ai/strikethroo/ in all integration and e2e suites.
- Open [**Integration and e2e tests must use the committed fixture workspace, not the live .ai/strikethroo/**](testing/practice-integration-and-e2e-tests-must-use-the-committed-fixture-workspace-not-the-live.md) — Tests reading .ai/strikethroo/ directly only pass locally; CI has no workspace on clean checkout. All tests must use src/__tests__/fixtures/serve-workspace/.
### #testing
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
- Open [**src/__tests__/fixtures/serve-workspace/ — committed fixture workspace for tests**](testing/map-src-tests-fixtures-serve-workspace-committed-fixture-workspace-for-tests.md) — Committed fixture workspace at src/__tests__/fixtures/serve-workspace/ is the hermetic replacement for the gitignored live .ai/strikethroo/ in all integration and e2e suites.
### #documentation
- Open [**Documentation captures current state only**](conventions/practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Phase is reserved for execution blueprint task groups**](conventions/practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
- Open [**Capture harness uses a committed fixture workspace, not the live .ai/strikethroo tree**](capture/practice-capture-harness-uses-a-committed-fixture-workspace-not-the-live-ai-strikethroo-t.md) — The capture:web harness defaults to src/capture/fixtures/capture-workspace/ for repeatable output. Set CAPTURE_WORKSPACE env var to override.
### #sse
- Open [**Use domcontentloaded not networkidle when Playwright-driving the SPA**](capture/practice-use-domcontentloaded-not-networkidle-when-playwright-driving-the-spa.md) — The SPA holds an open SSE connection (/api/events) so networkidle never fires. Use domcontentloaded plus explicit waitForSelector calls instead.
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
### #workspace
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](capture/map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.
