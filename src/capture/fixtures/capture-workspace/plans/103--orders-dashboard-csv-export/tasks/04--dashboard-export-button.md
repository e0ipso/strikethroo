---
id: 4
group: "ui"
dependencies: [1, 2]
status: "pending"
created: 2026-06-02
skills:
  - react
  - ux
---
# Add the dashboard Export CSV toolbar button and download flow

## Objective
Add an **Export CSV** control to the orders dashboard toolbar that downloads the
current view by requesting the export endpoint with the active date range.

## Skills Required
- **react**: the toolbar button and its loading/disabled states.
- **ux**: clear affordance, disabled-while-loading, and brief in-progress feedback.

## Acceptance Criteria
- [ ] An **Export CSV** button appears in the orders dashboard toolbar.
- [ ] Clicking it triggers a download of the current date-filtered orders.
- [ ] The request carries the dashboard's active `from`/`to` values.
- [ ] The button is disabled while the orders list is still loading.
- [ ] The button shows a brief in-progress state while the download is requested.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Read the active date range from the dashboard's existing filter state.
- Trigger the download by navigating to the export endpoint with matching query params.
- Reuse the toolbar's existing button styling; do not introduce a new control style.

## Input Dependencies
- The agreed `GET /api/orders/export` contract (`from`/`to` params) — coded against
  the same parameters the dashboard already uses, so this can proceed in parallel
  with Task 003.

## Output Artifacts
- The user-facing Export CSV action completing the feature.

## Implementation Notes
Coordinate the query-parameter names with Task 003 so the button and endpoint
agree. Keep the loading/disabled states consistent with the dashboard's other
toolbar actions.
