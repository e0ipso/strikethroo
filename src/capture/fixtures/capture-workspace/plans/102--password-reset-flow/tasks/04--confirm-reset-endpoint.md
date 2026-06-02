---
id: 4
group: "reset-completion"
dependencies: [2]
status: "pending"
created: 2026-06-02
skills:
  - api
  - security
---
# Confirm-reset API endpoint

## Objective
Add the endpoint that completes the flow: validate the supplied token, set the
new password, consume the token so it cannot be reused, and revoke all of the
user's active sessions.

## Skills Required
- `api` — define the confirm route and request/response contract.
- `security` — enforce token validation, single-use consumption, and session
  revocation correctly.

## Acceptance Criteria
- [ ] `POST /auth/password-reset/confirm` accepts a raw token and a new password.
- [ ] The token is looked up by hash and rejected if expired, consumed, or
      unknown — with no password change on rejection.
- [ ] On success the credential is updated, the token is consumed atomically, and
      all of the user's active sessions are revoked.
- [ ] The new password is validated against the existing password policy.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Reuse the Task 1 repository for lookup-by-hash and consume.
- Hash the supplied raw token and compare; never log the raw token or password.
- Consumption and credential update happen in a single transaction so a failure
  cannot leave a half-applied reset.

## Input Dependencies
- Task 2: establishes the request leg and the token issuance contract.

## Output Artifacts
- The confirm-reset endpoint, exercised by the UI (Task 5) and the tests (Task 6).

## Implementation Notes
Reject before any write when the token is invalid. Revoke sessions through the
existing session store's bulk-revoke path rather than reimplementing it.
