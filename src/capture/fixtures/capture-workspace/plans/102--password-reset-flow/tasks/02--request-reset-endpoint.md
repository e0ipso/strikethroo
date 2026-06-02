---
id: 2
group: "token-issuance"
dependencies: [1]
status: "pending"
created: 2026-06-02
skills:
  - api
  - typescript
---
# Request-reset API endpoint

## Objective
Add the endpoint that starts the flow: given an email, it issues a fresh
hashed, 30-minute, single-use token and triggers the reset email — while always
returning an identical response so the endpoint cannot be used to enumerate
which addresses have accounts.

## Skills Required
- `api` — define and wire the route into the existing auth surface.
- `typescript` — implement the handler against the Task 1 repository.

## Acceptance Criteria
- [ ] `POST /auth/password-reset/request` accepts an email and returns a generic
      success response.
- [ ] The response is identical for registered and unregistered addresses.
- [ ] For a registered address, a hashed token with a 30-minute expiry is created
      and the reset email (Task 3) is dispatched with the raw token in the link.
- [ ] Basic rate considerations are respected (no unbounded token creation per
      address within the window).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Reuse the Task 1 token repository to create records.
- The raw token is generated here, placed in the emailed link, and discarded;
  only its hash is stored.
- Do not branch the response on account existence.

## Input Dependencies
- Task 1: token model and repository.

## Output Artifacts
- The request-reset endpoint, consumed by the UI (Task 5) and the email (Task 3).

## Implementation Notes
Generate the raw token with a cryptographically secure source. Perform the
token-creation and email-dispatch work for known accounts without altering the
response timing or shape for unknown ones.
