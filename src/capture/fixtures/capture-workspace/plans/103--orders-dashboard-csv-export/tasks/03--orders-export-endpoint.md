---
id: 3
group: "api"
dependencies: [1, 2]
status: "pending"
created: 2026-06-02
skills:
  - typescript
  - http
---
# Add the `GET /api/orders/export` endpoint that streams filtered CSV

## Objective
Expose an endpoint that reads the dashboard's `from`/`to` query parameters,
applies the shared date-range filter, serializes the matching orders to CSV, and
responds as a downloadable file.

## Skills Required
- **typescript**: the request handler wiring the filter and serializer together.
- **http**: correct response headers for a file download.

## Acceptance Criteria
- [ ] `GET /api/orders/export?from=&to=` returns the matching orders as CSV text.
- [ ] The response sets `Content-Type: text/csv`.
- [ ] The response sets `Content-Disposition: attachment` with a sensible filename.
- [ ] The endpoint reuses `filterByDateRange` (Task 002) and `toCsv` (Task 001).
- [ ] For the same range, the endpoint returns the same orders as the dashboard API.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Parse `from`/`to` identically to the dashboard query.
- Stream the serialized body rather than buffering very large result sets in memory.
- Do not introduce a new permission — gate it behind the existing dashboard access.

## Input Dependencies
- `toCsv` from Task 001.
- `filterByDateRange` from Task 002.

## Output Artifacts
- The `GET /api/orders/export` route consumed by the dashboard button (Task 004).

## Implementation Notes
Verify the download with `curl -i` and confirm both headers are present before
wiring the UI. The columns must match the dashboard table: Order ID, customer,
status, total, order date.
