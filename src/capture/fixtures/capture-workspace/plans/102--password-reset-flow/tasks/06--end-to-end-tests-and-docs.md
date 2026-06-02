---
id: 6
group: "verification-and-docs"
dependencies: [4, 5]
status: "pending"
created: 2026-06-02
skills:
  - testing
  - documentation
---
# End-to-end tests and documentation

## Objective
Close the plan by proving the whole flow works and documenting it: an end-to-end
test covering the happy path and the token-rejection cases, plus user-facing and
maintainer-facing documentation.

## Skills Required
- `testing` — author the end-to-end coverage across both endpoints and the UI.
- `documentation` — write the user help entry and the maintainer notes.

## Acceptance Criteria
- [ ] An end-to-end test covers the full happy path: request → email link →
      reset → new password authenticates.
- [ ] Tests assert the request endpoint is non-enumerable (identical responses).
- [ ] Tests assert expired, malformed, and already-consumed tokens are rejected
      with no credential change, and that a reset revokes prior sessions.
- [ ] A user help entry and maintainer notes (token lifecycle + non-enumeration)
      are written.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Intercept outbound email in the test environment to extract the reset link.
- Use the existing e2e harness and assertion conventions.
- Cover the rejection branches, not just the happy path.

## Input Dependencies
- Task 4: the confirm-reset endpoint.
- Task 5: the request and reset UI screens.

## Output Artifacts
- The end-to-end test suite for the reset flow.
- User help entry and maintainer documentation.

## Implementation Notes
Drive the flow through the UI where practical so the tests double as living
documentation of the user journey.
