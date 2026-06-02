---
id: 5
group: "reset-completion"
dependencies: [3]
status: "pending"
created: 2026-06-02
skills:
  - react
  - css
---
# Request and reset UI screens

## Objective
Add the two user-facing screens: a "forgot password?" request form that posts an
email to the request endpoint, and a token-driven reset form (reached from the
emailed link) that posts a new password to the confirm endpoint.

## Skills Required
- `react` — build the two forms and their submission/loading/error states.
- `css` — style them consistently with the existing auth screens.

## Acceptance Criteria
- [ ] A "forgot password?" link on the login screen routes to the request form.
- [ ] The request form submits an email and always shows the same confirmation
      message (mirroring the non-enumerable backend response).
- [ ] The reset form reads the token from the link, takes a new password with
      confirmation, and surfaces policy/validation errors inline.
- [ ] Expired/invalid token responses render a clear "request a new link" state.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Consume the request endpoint (Task 2) and the confirm endpoint (Task 4).
- Read the token from the URL; never display it back to the user.
- Reuse existing form primitives and the auth screen layout.

## Input Dependencies
- Task 3: the emailed link defines the reset page URL and token parameter.

## Output Artifacts
- The request and reset screens, exercised end to end by Task 6.

## Implementation Notes
Keep the confirmation copy identical regardless of submitted address so the UI
does not undo the backend's non-enumeration guarantee.
