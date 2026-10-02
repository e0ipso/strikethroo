# Project knowledge base

This directory holds the project's AI-session-derived knowledge base. It is built and maintained by [`kenkeep`](https://github.com/e0ipso/kenkeep). Everything inside it is plain markdown; you can read it in any editor or on the GitHub web UI.

## What this is

When you (or a teammate) run an AI coding session against this repo, the tool watches the session and extracts candidate knowledge: project conventions, prohibitions, named modules and features, gotchas. The curator turns those candidates into knowledge nodes under `nodes/`. You review and accept the new content via `git`. A `SessionStart` hook injects the entry catalog (a compact, whole-tree branch list) into every new AI session, so the harness starts each conversation with the project's accumulated context.

## How knowledge gets here

1. **Capture.** During an AI session, a hook records redacted slices of the transcript to `_sessions/`.
2. **Curate (deferred).** When enough sessions accumulate, you run `/kk-curate` (or `npx kenkeep curate`). The curator reads pending sessions and applies its decisions directly to `nodes/`: new files for `add` actions, in-place rewrites for `modify`. Contradictions are written as markdown files under `conflicts/` for the curate skill to surface to you in-session; you review them with `git diff` and accept by committing or reject with `git restore`.
3. **Extract (live, optional).** When the current session already produced durable knowledge, run `/kk-session-extract` to process the visible context immediately without waiting for the deferred batch path.
4. **Review.** The changes show up in `git status` like any other code change. Inspect with `git diff`, accept with `git commit`, reject with `git restore <file>`. The lint-staged pre-commit hook regenerates `ENTRY.md` and `GRAPH.md` and stages them into the same commit. The curator already rebuilt the index over every written node, so if you reject some with `git restore` and don't commit another `nodes/` change, run `npx kenkeep index rebuild` to drop the removed nodes from the generated index (the pre-commit hook only fires when a `nodes/` change is committed).
5. **Consume.** Every future session sees the new nodes in its injected index.

## How to read a node

Each leaf `.md` file in `nodes/` is an OKF concept document: the native OKF
fields are `type`, `title`, `description`, and `tags`; kenkeep-specific fields
use the `kk_` prefix. Key fields:

- `type`: `practice` (how we build things: conventions, prohibitions, gotchas)
  or `map` (what exists in the project: features, vocabulary, locations).
- `description`: one-line preview shown in generated folder indexes.
- `tags`: free-form labels grouped under `## By topic` in folder indexes.
- `kk_id`: stable node identity. References use ids, not paths, so leaves can
  move between topical folders.
- `kk_derived_from`: session log filenames, doc paths, or URLs that produced or
  refined this node.
- `kk_relates_to` / `kk_depends_on`: cross-references rendered in `GRAPH.md` and
  in each leaf's generated Related section.

## Manually adding a node

Two paths, both human-in-the-loop via git:

- From the terminal: `npx kenkeep node add` (interactive prompts).
- From inside a Claude Code session: `/kk-add`.

Either way the result lands in `nodes/<id>.md` (at the root, or a chosen topical folder). Review with `git diff` and commit to accept.

## Bootstrap from existing docs

If your repo already has READMEs, ADRs, and module docs, you can seed the knowledge base from them with `/kk-bootstrap` (a one-time, supervised pass) or `npx kenkeep bootstrap --from docs/` (for picking up new or changed docs later). Both write directly to `nodes/`; you review with `git diff` and accept the ones you want.

## Subdirectories

- `nodes/`: an OKF v0.1 bundle of knowledge nodes in nested topical folders
  (`type` — `practice`/`map` — is a frontmatter facet, not a directory).
  Reviewed via git.
- `_sessions/`: raw captured transcripts (gitignored by default).
- `_logs/`: stream-json traces from LLM-driven runs (gitignored).
- `conflicts/`: one markdown file per curator-detected contradiction, surfaced by the kk-curate skill and reviewed via `git diff`.
- `FOLDER_SUMMARIES.md`: committed sidecar that stores folder descriptions used
  by generated indexes.
- `ENTRY.md`: the entry catalog (whole-tree totals + top-level branch list); injected into every new session. Regenerated automatically on commit.
- `GRAPH.md`: full edge listing of nodes; available for the harness to read on demand. Regenerated automatically on commit.

## Learn more

See the [docs site](https://github.com/e0ipso/kenkeep) for the full reference, troubleshooting guide, and architecture overview.
