---
id: 6
group: "finalization"
dependencies: [4, 5]
status: "completed"
created: 2026-06-02
skills:
  - playwright
  - technical-writing
---
# Rewrite Customize e2e suite and update AGENTS.md

## Objective
Rewrite the existing Customize e2e suite for the new card-grid listing + editor
detail + save round-trip, and update AGENTS.md to reflect the redesigned
Customize section, the new second sanctioned mutation (config write endpoint),
and the new build-time-only CodeMirror/YAML devDependencies.

## Skills Required
- `playwright` — rewrite the browser e2e suite against the prebuilt SPA.
- `technical-writing` — update AGENTS.md accurately.

## Acceptance Criteria
- [ ] `src/__tests__/customize-screen.e2e.test.ts` is rewritten to assert: both tabs render a multi-column card grid; a card shows eyebrow (relative path), title, and (where present) description; clicking a card navigates to `/customize/:kind/:id`; the detail page shows the editor; editing + Save persists (round-trip verified, then reverted/isolated so the suite is repeatable).
- [ ] The save round-trip test does not corrupt the repo's real config (operates against an isolated/temp workspace or restores the file), consistent with how other e2e/integration tests isolate state.
- [ ] `npm test` (unit + e2e) passes.
- [ ] AGENTS.md is updated: the serve section no longer says archive is the *sole* mutation; documents `PUT /api/config/:kind/:id`, its strict-allowlist guarantees, and `config-write.ts`; the Web SPA section describes the card-grid Customize listing and the CodeMirror editor detail route; notes CodeMirror and the YAML tooling as SPA-only/build-time devDependencies that must never move to `dependencies`; clarifies the editor is a separate boundary from `renderMarkdown`.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Tests run via `@playwright/test` against the prebuilt `dist-web/` with real Chromium (`npm run test:e2e`); run `npm run build` first so assets exist.
- Test philosophy — write a few tests, mostly integration: cover the critical user workflows (browse grid → open detail → edit → save) and the not-found/empty states; do NOT add per-card or framework-feature tests. Test the app's behavior, not CodeMirror or Playwright internals.

## Input Dependencies
- Task 4: the card-grid listing.
- Task 5: the editor detail route and save flow.

## Output Artifacts
- Rewritten `src/__tests__/customize-screen.e2e.test.ts`.
- Updated `AGENTS.md`.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. Read the existing `src/__tests__/customize-screen.e2e.test.ts` and the sibling e2e suites (`archive-action.e2e.test.ts`, `plan-detail-*`) for the established server-spinup + workspace-fixture pattern. Reuse that harness.
2. For the save round-trip, point the server at a temp/fixture workspace copy (or snapshot+restore the target file) so the test is repeatable and the repo's real config is untouched — mirror how `archive-action.e2e.test.ts` isolates its workspace.
3. Assertions: locate the grid container, assert ≥1 `.cz__card`; click one; `waitForFunction(() => location.pathname.startsWith('/customize/'))`; assert the CodeMirror editor mounted (e.g. `.cm-editor`); type into it, click Save, await a success indicator; reload and assert the new content is present.
4. AGENTS.md edits — locate the "Serve feature (`src/serve/`)" paragraph stating the archive move is "the sole route that mutates workspace files" and correct it; update the "Web SPA (`src/web/`)" Customize description; reaffirm the no-runtime-frontend-deps rule including CodeMirror and YAML tooling.
5. Run the full gate: `npm run build && npx playwright install --with-deps chromium` (if needed) `&& npm test`.
</details>
