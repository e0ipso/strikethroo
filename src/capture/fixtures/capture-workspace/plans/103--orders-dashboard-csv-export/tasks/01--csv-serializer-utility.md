---
id: 1
group: "serialization"
dependencies: []
status: "completed"
created: 2026-06-02
skills:
  - typescript
  - unit-testing
---
# Build the pure CSV serializer utility

## Objective
Provide a single pure function that turns an ordered column set and an array of
order records into RFC-4180-correct CSV text, centralizing all quoting and
escaping rules so no consumer hand-rolls string joins.

## Skills Required
- **typescript**: a small, dependency-free module exporting the serializer.
- **unit-testing**: focused tests for the escaping edge cases.

## Acceptance Criteria
- [x] `toCsv(columns, rows)` returns a header row followed by one row per record.
- [x] Fields containing a comma, double quote, or newline are wrapped in double quotes.
- [x] Embedded double quotes are escaped by doubling them (`"` → `""`).
- [x] The function is pure and synchronous (no I/O, no shared state).
- [x] Unit tests cover a plain field, a comma field, a quoted field, and a newline field.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Export `toCsv(columns: Column[], rows: Order[]): string` from a new module.
- Join rows with `\r\n` per RFC 4180; emit the header from the column labels.
- Do not pull in a CSV dependency for this column set — the escaping rule is small.

## Input Dependencies
None — this is a foundational primitive.

## Output Artifacts
- A `toCsv` serializer consumed by the export endpoint (Task 003).

## Implementation Notes
The only logic worth testing here is the quoting/escaping branch — the tricky
inputs (commas in customer names, quotes in notes, embedded newlines). Test that,
not the trivial happy path.

### Results
Implemented `toCsv` with a `needsQuoting` helper covering commas, quotes, and
newlines, plus four unit tests. All green.
