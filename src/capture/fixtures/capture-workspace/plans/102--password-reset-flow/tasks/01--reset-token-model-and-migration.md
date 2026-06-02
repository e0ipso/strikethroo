---
id: 1
group: "token-foundation"
dependencies: []
status: "pending"
created: 2026-06-02
skills:
  - database
  - typescript
---
# Reset token model and migration

## Objective
Provide the persistent foundation the whole flow builds on: a password-reset
token record that stores a **hash** of the token (never the raw value), an
expiry timestamp, and a single-use consumed marker, plus the migration that
creates it.

## Skills Required
- `database` — author the migration and indexes.
- `typescript` — define the token model/repository the endpoints consume.

## Acceptance Criteria
- [ ] A `password_reset_tokens` table exists with a user reference, a hashed-token
      column, an `expires_at` timestamp, and a `consumed_at` (nullable) marker.
- [ ] The raw token is never stored; only its hash is persisted.
- [ ] A repository exposes create, lookup-by-hash, and consume operations.
- [ ] The migration runs forward and back cleanly against a fresh database.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Follow the existing migration tooling and naming conventions in the repo.
- Index the hashed-token column for constant-time lookup on confirm.
- 30-minute validity is enforced by the consuming endpoints against `expires_at`;
  this task only stores the timestamp.

## Input Dependencies
- None. This is the foundation task.

## Output Artifacts
- The `password_reset_tokens` table and migration.
- A token repository (create / find-by-hash / consume) consumed by Tasks 2 and 4.

## Implementation Notes
Hash with the same one-way primitive used elsewhere for sensitive tokens. Keep
the model thin — validation (expiry, single-use) lives in the endpoints so the
rules are tested at the boundary.
