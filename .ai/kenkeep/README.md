# Project knowledge base

This directory holds the project's AI-session-derived knowledge base. It is built and maintained by [`kenkeep`](https://github.com/e0ipso/kenkeep). Everything inside it is plain markdown; you can read it in any editor or on the GitHub web UI.

## What this is

When you (or a teammate) run an AI coding session against this repo, the tool watches the session and extracts candidate knowledge: project conventions, prohibitions, named modules and features, gotchas. The curator turns those candidates into knowledge nodes under `nodes/`. You review and accept the new content via `git`. A `SessionStart` hook injects the entry catalog (a compact, whole-tree branch list) into every new AI session, so the harness starts each conversation with the project's accumulated context.

## How knowledge gets here

1. **Capture.** During an AI session, a hook records redacted slices of the transcript to `_sessions/`.
2. **Curate.** When enough sessions accumulate, you run `/kk-curate` (or `npx kenkeep curate`). The curator reads pending sessions and applies its decisions directly to `nodes/`: new files for `add` actions, in-place rewrites for `modify`. Contradictions are written as markdown files under `conflicts/` for the curate skill to surface to you in-session; you review them with `git diff` and accept by committing or reject with `git restore`.
3. **Review.** The changes show up in `git status` like any other code change. Inspect with `git diff`, accept with `git commit`, reject with `git restore <file>`. The lint-staged pre-commit hook regenerates `ENTRY.md` and `GRAPH.md` and stages them into the same commit.
4. **Consume.** Every future session sees the new nodes in its injected index.

## How to read a node

Each `.md` file in `nodes/` has a frontmatter header and a markdown body. Key fields:

- `kind`: `practice` (how we build things: conventions, prohibitions, gotchas) or `map` (what exists in the project: features, vocabulary, locations).
- `tags`: free-form labels grouped under `## By topic` in the folder index nodes (`index.md`).
- `derived_from`: list of session log filenames or doc paths that produced or refined this node. (Note: `_sessions/` is gitignored by default, so provenance only resolves for the original contributor unless your team commits it.)
- `relates_to`: cross-references rendered in `GRAPH.md`.
- `summary`: ≤140-character one-liner shown in the folder index nodes (`index.md`). Git history is the timeline of record for when a node was written or rewritten.

## Manually adding a node

Two paths, both human-in-the-loop via git:

- From the terminal: `npx kenkeep node add` (interactive prompts).
- From inside a Claude Code session: `/kk-add`.

Either way the result lands in `nodes/<id>.md` (at the root, or a chosen topical folder). Review with `git diff` and commit to accept.

## Bootstrap from existing docs

If your repo already has READMEs, ADRs, and module docs, you can seed the knowledge base from them with `/kk-bootstrap` (a one-time, supervised pass) or `npx kenkeep bootstrap-incremental --from docs/` (for picking up new or changed docs later). Both write directly to `nodes/`; you review with `git diff` and accept the ones you want.

## Subdirectories

- `nodes/`: knowledge nodes in nested topical folders (`kind` — `practice`/`map` — is a frontmatter facet, not a directory). Reviewed via git.
- `_sessions/`: raw captured transcripts (gitignored by default).
- `_logs/`: stream-json traces from LLM-driven runs (gitignored).
- `conflicts/`: one markdown file per curator-detected contradiction, surfaced by the kk-curate skill and reviewed via `git diff`.
- `ENTRY.md`: the entry catalog (whole-tree totals + top-level branch list); injected into every new session. Regenerated automatically on commit.
- `GRAPH.md`: full edge listing of nodes; available for the harness to read on demand. Regenerated automatically on commit.

## Learn more

See the [docs site](https://github.com/e0ipso/kenkeep) for the full reference, troubleshooting guide, and architecture overview.
