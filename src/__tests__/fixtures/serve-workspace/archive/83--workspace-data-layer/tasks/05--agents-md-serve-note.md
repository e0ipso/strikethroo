---
id: 5
group: "documentation"
dependencies: [3]
status: "completed"
created: 2026-05-28
skills:
  - technical-writing
---
# Document the serve data layer in AGENTS.md

## Objective
Add a short note to `AGENTS.md` stating that `src/serve/` hosts the `serve`
feature and that `workspace-model.ts` is the pure data layer the runtime
server consumes — the first of the serve-related additions, written so later
tickets (03, 13) can extend the same section.

## Skills Required
- **technical-writing**: Concise, accurate documentation matching the existing
  AGENTS.md tone and structure.

## Acceptance Criteria
- [ ] `AGENTS.md` contains a brief note that `src/serve/` is the home of the
      `serve` feature.
- [ ] The note states `src/serve/workspace-model.ts` is the pure, synchronous,
      read-only data layer that the runtime server consumes.
- [ ] The note is phrased so tickets 03 and 13 can extend the same section
      later (i.e. it reads as the first entry of a serve section, not a one-off).
- [ ] No README or other user-facing docs are changed (deferred to ticket
      03/13 per the plan).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Edit the existing `/workspace/AGENTS.md` only. Do not create new doc files.
- Match the document's existing heading/section conventions; place the note
  where serve-related architecture naturally belongs (near the source-layout /
  build-pipeline discussion).

## Input Dependencies
- Task 3: the existence and shape of `src/serve/workspace-model.ts` (so the
  note describes what was actually built).

## Output Artifacts
- An updated `AGENTS.md` with the serve data-layer note.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

Keep it short — a sentence or two, or a small subsection. Example framing:

> `src/serve/` hosts the `serve` feature. `workspace-model.ts` is the pure,
> synchronous, side-effect-free data layer that scans `.ai/strikethroo/` and
> returns the stable JSON model the runtime server (and the UI screens)
> consume. Later serve work (the HTTP/SSE server and build integration) extends
> this directory.

Do not touch README or any other docs; ticket 03/13 owns user-facing docs and
the `serve` command. Match AGENTS.md's existing prose style and place the note
logically within the source/architecture discussion.
</details>
