---
id: 2
group: "query"
dependencies: []
status: "completed"
created: 2026-06-02
skills:
  - typescript
  - refactoring
---
# Extract the date-range orders filter into a reusable function

## Objective
Lift the date-range filtering predicate currently embedded in the dashboard
query into a standalone, reusable function so the export and the dashboard apply
identical criteria and the downloaded file always matches the on-screen list.

## Skills Required
- **typescript**: a reusable predicate/selector over the orders collection.
- **refactoring**: extract existing inline logic without changing dashboard behavior.

## Acceptance Criteria
- [x] `filterByDateRange(orders, { from, to })` returns only orders within the inclusive range.
- [x] An absent `from` or `to` is treated as open-ended on that side.
- [x] The dashboard query path is refactored to call the extracted function (no behavior change).
- [x] Existing dashboard order-list tests still pass after the refactor.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Export `filterByDateRange(orders, range)` from the orders query module.
- Preserve the dashboard's current inclusivity semantics exactly.
- Keep the function pure so both callers can reuse it without side effects.

## Input Dependencies
None — independent of the serializer; can be built in parallel with Task 001.

## Output Artifacts
- A shared `filterByDateRange` function consumed by the export endpoint (Task 003)
  and the dashboard.

## Implementation Notes
The risk here is silently changing dashboard results during extraction. Refactor
the predicate verbatim and lean on the existing dashboard tests to prove the
behavior is unchanged.

### Results
Extracted `filterByDateRange` and pointed the dashboard query at it; the inline
predicate is gone and the existing list tests pass unchanged.
