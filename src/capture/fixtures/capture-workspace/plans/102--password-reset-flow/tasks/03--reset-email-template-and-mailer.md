---
id: 3
group: "token-issuance"
dependencies: [1]
status: "pending"
created: 2026-06-02
skills:
  - email
  - typescript
---
# Reset email template and mailer integration

## Objective
Add the transactional email that delivers the reset link, sent through the
existing mailer. The message embeds the raw token in a link to the reset page
and clearly states that the link expires in 30 minutes and can be used once.

## Skills Required
- `email` — author the templated message (HTML + plaintext).
- `typescript` — wire the template into the existing mailer.

## Acceptance Criteria
- [ ] A reset-link email template exists with both HTML and plaintext parts.
- [ ] The template renders a link to the reset page carrying the raw token.
- [ ] Copy states the 30-minute expiry and single-use nature, and includes a
      "you can ignore this if you didn't request it" line.
- [ ] The email is sent through the existing transactional mailer, not new infra.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Reuse the existing mailer client and templating approach.
- The link base URL comes from configuration, not a hard-coded host.
- The template receives the raw token from Task 2; it never reads the token store.

## Input Dependencies
- Task 1: defines the token whose raw value the link carries.

## Output Artifacts
- The reset-link email template and its mailer wiring, invoked by Task 2.

## Implementation Notes
Keep the template parameterized on the link and an optional display name. Mirror
the structure of an existing transactional template so styling stays consistent.
