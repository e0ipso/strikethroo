# Project knowledge base

This directory holds the project's AI-session-derived knowledge base. It is built and maintained by [`@e0ipso/ai-knowledge-base`](https://github.com/e0ipso/ai-knowledge-base). Everything inside it is plain markdown; you can read it in any editor or on the GitHub web UI.

## What this is

When you (or a teammate) run an AI coding session against this repo, the tool watches the session and extracts candidate knowledge: project conventions, prohibitions, named modules and features, gotchas. The curator turns those candidates into knowledge nodes under `nodes/`. You review and accept the new content via `git`. A `SessionStart` hook injects a token-budgeted index of these nodes into every new AI session, so the harness starts each conversation with the project's accumulated context.

## How knowledge gets here

1. **Capture.** During an AI session, a hook records redacted slices of the transcript to `_sessions/`.
2. **Curate.** When enough sessions accumulate, you run `/kb-curate` (or `npx @e0ipso/ai-knowledge-base curate`). The curator reads pending sessions and applies its decisions directly to `nodes/`: new files for `add` actions, in-place rewrites for `modify`. Contradictions are written as markdown files under `conflicts/` for the curate skill to surface to you in-session; you review them with `git diff` and accept by committing or reject with `git restore`.
3. **Review.** The changes show up in `git status` like any other code change. Inspect with `git diff`, accept with `git commit`, reject with `git restore <file>`. The lint-staged pre-commit hook regenerates `INDEX.md` and `GRAPH.md` and stages them into the same commit.
4. **Consume.** Every future session sees the new nodes in its injected index.

## How to read a node

Each `.md` file in `nodes/` has a frontmatter header and a markdown body. Key fields:

- `kind`: `practice` (how we build things: conventions, prohibitions, gotchas) or `map` (what exists in the project: features, vocabulary, locations).
- `tags`: free-form labels grouped under `## By topic` in `INDEX.md`.
- `derived_from`: list of session log filenames or doc paths that produced or refined this node. (Note: `_sessions/` is gitignored by default, so provenance only resolves for the original contributor unless your team commits it.)
- `relates_to`: cross-references rendered in `GRAPH.md`.
- `summary`: ≤140-character one-liner injected via `INDEX.md`. Git history is the timeline of record for when a node was written or rewritten.

## Manually adding a node

Two paths, both human-in-the-loop via git:

- From the terminal: `npx @e0ipso/ai-knowledge-base node add` (interactive prompts).
- From inside a Claude Code session: `/kb-add`.

Either way the result lands in `nodes/<kind>/<kind>-<slug>.md`. Review with `git diff` and commit to accept.

## Bootstrap from existing docs

If your repo already has READMEs, ADRs, and module docs, you can seed the KB from them with `/kb-bootstrap` (a one-time, supervised pass) or `npx @e0ipso/ai-knowledge-base bootstrap-incremental --from docs/` (for picking up new or changed docs later). Both write directly to `nodes/`; you review with `git diff` and accept the ones you want.

## Subdirectories

- `nodes/`: knowledge nodes, organized by kind (`practice/`, `map/`). Reviewed via git.
- `_sessions/`: raw captured transcripts (gitignored by default).
- `_logs/`: stream-json traces from LLM-driven runs (gitignored).
- `conflicts/`: one markdown file per curator-detected contradiction, surfaced by the kb-curate skill and reviewed via `git diff`.
- `INDEX.md`: token-budgeted summary; injected into every new session. Regenerated automatically on commit.
- `GRAPH.md`: full edge listing of nodes; available for the harness to read on demand. Regenerated automatically on commit.

## Learn more

See the [docs site](https://github.com/e0ipso/ai-knowledge-base) for the full reference, troubleshooting guide, and architecture overview.
