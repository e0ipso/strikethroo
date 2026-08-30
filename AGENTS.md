# AGENTS.md

Primary context source for AI-assisted work in this repository.

## Quick Start

```bash
# Build, then run any of the four commands
npm run build
npm start init --harnesses claude --destination-directory /path/to/project   # --force to overwrite all
node dist/cli.js export profile --destination-directory /path/to/package
node dist/cli.js serve                                                       # or: npx strikethroo serve
node dist/cli.js validate                                                    # --workspace <path>, --json

# Development
npm run dev           # Watch mode compilation
npm test              # Full gate: unit (Vitest) then e2e (@playwright/test)
npm run lint:fix      # Auto-fix style
```

`init` bootstraps the `.ai/strikethroo/` workspace (and copies Claude agents); it does **not** install skills. It uses SHA-256 hash tracking in `.ai/strikethroo/.init-metadata.json` to detect and protect user-modified files; `--force` bypasses the prompts for automation.

The CLI registers four commands (`src/cli.ts`): `init`, the nested `export profile`, `serve`, and `validate`. Every action stays thin — it parses flags, delegates to a module, and owns only the reporting and the exit code.

The workflow ships as harness-agnostic **Agent Skills**, installed with `npx skills add e0ipso/strikethroo` — see [Distribution](#distribution) for how the Git tree serves this. Append `#<git-ref>` to install from a specific branch or tag (e.g. `#v3.19.1`) using the installer's own Git-ref syntax; `@<name>` filters by skill name.

---

## Glossary

- **Work order** — The user's request describing what they want accomplished.
- **Plan** — Comprehensive document covering requirements, architecture, risks, and success criteria.
- **Execution blueprint** — All tasks organized into dependency-mapped phases. Output of task generation.
- **Phase** — A group of tasks that execute in parallel. Phases run in sequence.
- **Task** — An atomic unit of work with 1-2 skills and clear acceptance criteria. Executed by a sub-agent.
- **Sub-agent** — A specialized AI agent executing a single task with focused, clean context.

---

## Project Overview

This CLI tool initializes AI-assisted development environments with hierarchical task management. It transforms complex programming requests into atomic, validated implementations through staged refinement — managing AI context load, enforcing YAGNI scope control, and ensuring working code through integrity-focused testing.

### Design thesis

Read this before changing anything under `src/skill-prompts/` or `src/skill-scripts/`; most non-obvious decisions in those trees follow from it. User-facing version: [`docs/why.md`](docs/why.md).

Three premises:

1. **The agent is an unreliable narrator of its own work.** A subagent's success report is a claim, not evidence — hence `config/shared/verification-gate.md` and the per-skill anti-rationalization tables, which enumerate *the specific excuses a model generates when about to skip a discipline* rather than giving general advice.
2. **A second agent reviewing the first is also unreliable.** Hence the reviewer's own rationalization table, its hard restriction to conformance and demonstrable defects, and the fact that its findings are recorded for a human-directed implementer rather than applied. The reviewer's opinion is input, never a verdict.
3. **The scarce resource is the user's attention, not tokens.** It is rationed toward the plan, where a correction costs a sentence, and away from the diff, where the same correction costs a review cycle. The automated gate is a filter that runs *before* the user's read — which is why its mandate excludes design and abstraction opinions. Those are what the user's read is preserved for.

The structural consequence, and the invariant to preserve: **negotiable configuration is Markdown; guarantees are compiled.** Hooks, templates, and project context are user-editable Markdown. The certification rule (an uncertified review is never reported as clean) and the reviewer/implementer harness separation live in TypeScript and cannot be loosened by editing a hook. When adding enforcement, decide which side of that line it belongs on and put it there — a bound that a user can raise from a hook is not a bound.

Corollary for "speed": the target metric is **time-to-merge, not time-to-first-draft**. Do not introduce changes that trade merge-readiness for faster generation, and do not describe the project as trading speed for quality — on the time-to-merge clock they are the same number.

---

## Strikethroo Plan and Task Management System

### Workflow Skills

Each step is an Agent Skill that auto-loads when the user's request matches its description:

- `st-create-plan` — strategic plan creation with mandatory clarification gates (prevents assumption-based planning).
- `st-generate-tasks` — task decomposition into dependency-mapped atomic units (enforces 20-30% task reduction, 1-2 skills max per task).
- `st-execute-blueprint` — execution orchestration across all tasks, with dependency-aware parallelism and quality gates.
- `st-refine-plan` — plan refinement loop: a second assistant "red teams" an existing plan, asks questions, and applies refinements. Bridges plan creation and task generation.
- `st-execute-task` — single-task execution.
- `st-full-workflow` — end-to-end chaining of plan → tasks → blueprint for hands-off runs.
- `st-code-review` — terminal review gate that runs after blueprint execution, critiques the cumulative diff on a discovered second harness, and reports schema-validated findings for the implementer to act on.

### Key Design Principles

- **Atomic decomposition** — max 2 skills per task (3+ triggers subdivision); automatic skill inference; explicit dependency mapping.
- **Scope control (YAGNI)** — anti-pattern enumeration, "Is this explicitly mentioned?" validation, 20-30% minimization targets, every task traceable to an explicit requirement.
- **Test philosophy: "Write a few tests, mostly integration"** — selective meaningful coverage over completeness; real filesystem operations over mocking; focus on custom logic, critical workflows, and edge cases; don't test third-party/framework features, trivial getters/setters, or obvious CRUD.

---

## Skills Layer

Skills live under `templates/harness/skills/<name>/` (flat, no nesting; the tracked root `skills/` directory is the release mirror described in [Distribution](#distribution), never a place to author anything). Each skill's `SKILL.md` and its compiled `.cjs` bundle under `scripts/` are assembled/bundled at build time — source and output share the same per-skill tree.

The seven shipping skills are the workflow skills listed above (`st-create-plan`, `st-generate-tasks`, `st-execute-blueprint`, `st-refine-plan`, `st-execute-task`, `st-full-workflow`, `st-code-review`).

### TypeScript source of truth

Runtime logic each skill needs is authored once in TypeScript under `src/skill-scripts/`, with shared helpers (frontmatter parsing, plan/archive scanning, root discovery) in `src/skill-scripts/shared/`. The subtree type-checks via `tsconfig.skill-scripts.json` and lints with `src/`, and the artifacts the skills actually ship are the esbuild bundles, never `tsc` output.

The main `tsconfig.json` lists `src/skill-scripts/**` under `exclude`, but read that precisely: `exclude` filters TypeScript's **root file set**, not the module graph. Anything the CLI domain imports is still compiled and emitted. `src/serve/` and `src/validation/` do import from `src/skill-scripts/shared/`, so `dist/skill-scripts/shared/` exists and holds exactly the transitive closure those imports reach — today `root`, `plan-scan`, `frontmatter`, and `complexity-score`, four of the subtree's nineteen files. Nothing else from `src/skill-scripts/` reaches `dist/`. Adding an import across that boundary widens the closure, so keep the crossings deliberate and few.

### Prompt source of truth

Each `SKILL.md` is built from `src/skill-prompts/skills/<name>/SKILL.md.hbs`. Shared procedures live in `src/skill-prompts/_partials/`; values use hash arguments and behavioral differences use block-partial slots at their call sites. Frontmatter contains only `name` and `description`. Read `src/skill-prompts/README.md` and `src/skill-prompts/AUTHORING.md` before editing prompts.

Enforcement disciplines shared **across** skills are not baked into each `SKILL.md`; they ship as required, project-customizable files under `config/shared/` (copied into the workspace by `init`, hash-tracked like hooks) and the skills read them **at runtime**. The three files: `verification-gate.md` (evidence-before-claims gate, applied at `st-execute-blueprint`/`st-full-workflow` phase-completion and post-execution), `clarification-gate.md` (one-question-at-a-time, multiple-choice-first, pre-emit approval, used by `st-create-plan`/`st-refine-plan`), and `anti-rationalization.md` (the excuse → red-flag framing; each consuming skill — `st-create-plan`, `st-generate-tasks`, `st-execute-blueprint` — supplies its own skill-specific rationalization table inline and points the agent at this shared framing). Because these files are required workspace shape, `CURRENT_WORKSPACE_SCHEMA_VERSION` is bumped; older workspaces must rerun `npx strikethroo init` before using updated skills. This mirrors how the `PRE_TASK_EXECUTION` TDD hook is shared.

### Execution routing (dispatch-time target selection)

`init` creates and hash-tracks `config/config.yaml`, while the workspace `.gitignore` ignores it by default. The file is local because harness permissions, installed models, and routing choices depend on the machine. Ignore rules do not untrack an existing file. A project that adopts this default later must explicitly run `git rm --cached .ai/strikethroo/config/config.yaml` and commit that index change; Strikethroo never mutates Git tracking automatically. Setup-profile import and export remain the explicit way to distribute a starting configuration.

The top-level `harnesses` section configures every external spawn for `claude`, `codex`, `cursor`, `gemini`, `copilot`, and `opencode`. `cli_args` is an ordered array of exact, non-empty strings. The loader preserves each value byte-for-byte after YAML decoding, rejects NUL characters and unknown shapes, and hashes a versioned representation containing the harness and ordered arguments. There is no permission denylist because the file is local. The shipping template uses `--dangerously-skip-permissions`, `--sandbox workspace-write`, `--force`, `--approval-mode yolo`, `--allow-all`, and `--auto` respectively. Arguments may grant broad authority, so never put credentials or tokens in them. `external-dispatch.ts` owns adapter construction and always uses `spawn` with `shell: false`; task dispatch, review dispatch, and readiness use the same ordered baseline. Authentication/status commands remain adapter-defined literal commands and never receive `cli_args`.

During task generation (`st-generate-tasks` and the task-generation step of `st-full-workflow`), each task is classified in-context into a named **execution profile** from the `execution_routing` section of `config/config.yaml` (guided by the `TASK_EXECUTION_ROUTING.md` hook). The bundled `route-task-execution.cjs` helper validates the complete assignment atomically and persists only `execution_profile`; tasks created without routing metadata continue to use the current harness defaults. Profiles carry arbitrary user-defined names, mandatory LLM-facing descriptions, and ordered exact targets. The shipping template enables `docs-and-config`, `standard-implementation`, and `complex-architecture`; users edit the local model matrix or set `profiles: {}` to disable routing.

Immediately before delegation, `dispatch-task-execution.cjs` selects one target from the persisted profile. The built-in selector chooses the first non-avoided target in configuration order. An optional repository-relative selector receives one task's complete candidates and accumulated avoid-set identifiers and returns one candidate identifier; override failures visibly fall back to current-harness defaults. Native/current-harness targets bypass configuration loading and readiness work. External readiness makes one request in a disposable Git workspace using the exact local `cli_args` and no model override. The harness must run a command that creates a nonce-bearing file, and Strikethroo verifies the contents before removing the workspace.

Availability outcomes are cached under the gitignored `.ai/strikethroo/runtime/` directory for 30 minutes when ready and 5 minutes when unavailable. Cache identity includes the harness, resolved executable path, ordered-argument hash, normalization version, and probe-registry version. A configuration, order, executable-path, or probe-contract change misses the old entry. Task execution reads the local configuration when it launches; changing it between resolution and execution is unsupported. An unavailable target is added to the avoid set and selection retries; exhaustion falls back to the current harness without model or reasoning overrides. `launched-success` means only that the child exited zero. Durable task status and verification evidence remain the completion authority. Source: `src/skill-scripts/shared/harness-configuration.ts`, `src/skill-scripts/shared/execution-routing.ts`, `src/skill-scripts/shared/dispatch-target-selector.ts`, `src/skill-scripts/shared/external-dispatch.ts`, `src/skill-scripts/shared/harness-availability.ts`, and `src/skill-scripts/dispatch-task-execution.ts`.

### Code Review Gate (terminal, report-only, optional-by-absence)

After `POST_EXECUTION` reports green, an optional review runs once before the execution summary and archival. When a second harness is discovered and the `CODE_REVIEW.md` hook is present and non-empty, `st-code-review` critiques the cumulative diff on the discovered harness and emits findings as schema-validated `review.xml`.

Reviewer discovery uses the same local invocation configuration and one-request readiness check as task routing. It excludes the current harness and passes its `cli_args` into review dispatch. Those arguments may give the CLI source-write capability, but the review contract stays report-only: the prompt prohibits source changes, the reviewer prints XML to stdout, and the orchestrator alone writes the findings artifact. There are no reviewer-specific argument layers.

**The gate reports; it does not decide.** There are no severity or confidence floors, no partition of findings into applied versus recorded, no automatic remediation, and no fix/re-review loop. A second harness gives its opinion, the findings are certified against the schema and written to `<plan-dir>/review/`, and the implementer reads them and chooses what to act on. `severity` and `confidence` ride along as advisory triage labels that nothing branches on, which is also why nothing in the prompt has to defend against a reviewer inflating them to clear a threshold. `<suggestion>` is not emitted by the reviewer at all: the element exists so a *human* reviewer can hand over exact replacement text, and applying an LLM's text verbatim without a human read is the thing this design gave up.

This is a deliberate reversal. The floors, the `MAX_REVIEW_ROUNDS` ceiling, and the `actionable`/`recorded` split all existed to make one decision safely: what may be auto-applied to working code unattended. Once nothing is auto-applied, that decision is gone and the apparatus that guarded it decides nothing. Do not reintroduce a threshold without first reintroducing the automatic fix it would gate.

The scope is a two-dot `git diff <base>` from the commit recorded before phase execution against the **working tree** — never `base...HEAD`, which would miss the uncommitted cleanup the gate exists to see. Untracked, unignored files are inside it: the gate synthesizes an add-diff per path with `git diff --no-index` against `/dev/null`, so nothing needs to be staged or committed for the reviewer to see it and the gate still never writes to the index. That independence is the point — the scope must not rest on `POST_PHASE.md`'s commit, which is a user-editable hook the gate does not own, and which cannot run at all in a repository whose pre-commit hook runs the test suite (the tree is intentionally partial between phases). Ignored paths stay out via `--exclude-standard`, which is also what keeps the gate's own `review/` output out of the diff. Build output and vendored files are excluded too: the gate drops every changed path that `.gitattributes` marks `linguist-generated` or `linguist-vendored`, resolved through `git check-attr` rather than a hard-coded list, since the gate runs inside the user's project and cannot know what that project generates. A finding against generated code is unactionable by construction, because the mandatory `POST_EXECUTION` re-run regenerates the file and erases any fix. The gate creates no task files and never mutates the execution blueprint.

**Disabling**: Emptying or deleting `CODE_REVIEW.md` skips the gate cleanly with a note in the execution summary. No error.

**`xmllint` is a soft dependency**: findings are validated against the vendored XSD by shelling out to it, so without it no review can be certified. Absence is checked before a reviewer is dispatched and joins the clean-skip set as `validator-absent` — a missing system package must never turn an otherwise successful plan into a failure, and no external harness is spent on a review that could not have been certified. A skip is not a pass: it records that the gate did not run, and its reason says why. Both CI workflows install `libxml2-utils` so the validation path is exercised there.

**An empty scope is reported, not certified**: when the diff is empty the gate skips as `empty-diff` before any reviewer is dispatched. A reviewer handed nothing to read returns no findings, which is indistinguishable from a clean review — so without this branch the one observable symptom of a collapsed scope would be a pass.

**The one guarantee, and it is compiled**: an uncertified review is never reported as a clean one. `_verdictFor` returns `review-recorded` only for an `evaluated` outcome; a findings document that is absent, schema-invalid, or unvalidatable stays `review-failed` and exits 1. Finding counts never affect the exit code, because the gate does not judge findings.

**The findings document has one delivery channel: the reviewer prints it, the orchestrator writes it**: the reviewer is instructed, unconditionally and with no write target named, to print the complete document between the dispatch's token-bearing delimiters, and `code-review.cjs` — the orchestrator's own process, never sandboxed — extracts it and performs the only write to `review/review.xml`. The contract is harness-agnostic by construction: every supported harness can write to stdout, so the review path introduces no reviewer-only sandbox flag or per-harness argument special case. The written document enters the same `validateAgainstSchema` call: the XSD stays the sole certification authority, there is no second parser, and nothing short-circuits into `parseReviewFindings`, whose linear tag scan is only safe behind validation. The per-dispatch collision token and the anti-echo guard — which rejects a delimited region that does not begin with `<?xml` or `<review`, which is why the placeholder inside the dispatch prompt's own block is deliberately prose so a reviewer echoing its instructions back cannot be read as a delivered document — are why the channel is trustworthy, and `runReview` removes the exact canonical path before dispatch so nothing from an earlier invocation can be certified. Nothing degrades into a clean review: a reviewer that could not inspect the repository stays uncertified, a transcript with no qualifying region keeps the `findings-absent` outcome, delivered XML that fails the schema stays `schema-invalid`, and a reviewer that exits non-zero is never certified even if its output carried a valid document. Capture is requested by `dispatchReview` alone — the review path only — and it tees every chunk to this process's stderr so operator-visible progress survives; task dispatch output behavior is unchanged, and the retained tail is bounded at `CAPTURED_STDOUT_LIMIT` (262,144 characters), truncating from the front so the delivered tail survives, since the delimited document is the reviewer's final output. A review that does not certify writes the captured transcript to `review/reviewer-output.txt`; a certifying one does not, and the write is best-effort and never changes a verdict.

**Schema version**: `CURRENT_WORKSPACE_SCHEMA_VERSION` deliberately remains `4`. Both files (`CODE_REVIEW.md` and `self-review-v2.xsd`) are optional by absence — existing v4 workspaces continue without re-running `init`, with the feature dormant until the workspace is updated.

**Source**: `src/skill-scripts/code-review.ts` (entrypoint, the clean-skip branches, diff scoping, reviewer dispatch, `_verdictFor`), `src/skill-scripts/shared/review-findings.ts` (`xmllint` validation, the tag scanner, `countFindings`), `src/skill-scripts/shared/harness-discovery.ts` (configuration-aware ready harnesses, current one excluded), and `src/skill-scripts/capture-base-commit.ts` (records `<plan-dir>/review/base-commit.json` before phase execution). Reviewer dispatch reaches the harness through the model-optional path in `src/skill-scripts/shared/external-dispatch.ts`; `execution_routing` still requires an exact model on its own path.

---

## Strikethroo Profiles

A **strikethroo profile** is a shareable setup package `init` can import via `--profile <value>`: a directory (local folder or git repository root) holding `profile.yaml` plus a sparse `config/` mirroring `.ai/strikethroo/config/`. Allowed `config/` contents: `hooks/*.md`, `templates/*.md`, `shared/*.md`, `config.yaml`, `STRIKETHROO.md` — flat `*.md` only inside the three subdirectories. The `schemas/` subtree is CLI-owned and forbidden surface, as are dotfiles and nested directories. Validation is all-or-nothing and runs before any workspace mutation; there is no partial import. Package-root entries other than `profile.yaml` and `config/` are deliberately tolerated and inert: a git-hosted profile inevitably carries `README.md`, `LICENSE`, `.git`, and the like, so validation scopes to the manifest plus `config/`, and staging copies only `config/` — root extras are never copied into the workspace, hash-tracked, or executed (integration-tested in `profiles.integration.test.ts`).

**Manifest** (`profile.yaml`; `schema_version` must equal `PROFILE_MANIFEST_SCHEMA_VERSION` = `1` in `src/profiles.ts` — any other version is refused with a message naming both versions and the upgrade direction):

| Field            | Required | Shape                                                     | Meaning                                             |
| ---------------- | -------- | --------------------------------------------------------- | --------------------------------------------------- |
| `schema_version` | yes      | integer, currently `1`                                    | Manifest format guard                               |
| `name`           | yes      | kebab-case string                                         | Identity; echoed at import, recorded in provenance  |
| `description`    | yes      | non-empty string                                          | One-line summary shown during init                  |
| `purpose`        | no       | string                                                    | Long-form statement of what the profile is tuned for |
| `tags`           | no       | list of strings                                           | Free-form discovery/labeling                        |
| `requires`       | no       | list of `{kind, name, install?}`; `kind` ∈ `skill`, `tool` | Hard prerequisites the profile assumes              |
| `recommends`     | no       | same entry shape as `requires`                            | Soft pairings                                       |
| `author`         | no       | string                                                    | Attribution                                         |

`requires` and `recommends` are strictly informational: printed in init's profile section ("this strikethroo profile assumes you have…" / "pairs well with"), never probed, executed, or installed.

**Resolution order** (`resolveProfileSource`, contractual): (a) the value names an existing directory on disk → local package read in place — unless it carries no `profile.yaml` but looks like a git repository (a `HEAD` file or `.git` entry), in which case it is treated as a clone URL so a bare-repo path materializes via clone instead of failing validation on the raw repository directory; (b) the value matches the `<user>/<repo>` GitHub shorthand → expanded to `https://github.com/<user>/<repo>.git`; (c) otherwise → used verbatim as a git URL (GitLab, ssh, any git host). The existing-path check runs first, so a relative local path that happens to look like `user/repo` resolves as the folder. Remote profiles are shallow-cloned (`--depth 1`); `git` on PATH is required only for remote imports.

**Overlay semantics.** Import stages an effective template tree in a temp directory: the shipped `templates/strikethroo/` tree copied whole, then the profile's `config/` files copied over it. That staging directory becomes the source for the unchanged `copyCommonTemplates` machinery, so conflict prompts, `--force`, and SHA-256 hash tracking treat profile-supplied files exactly like stock ones. Every temp directory is removed on every exit path, success or failure.

**Fork-and-forget.** A profile is consumed once at import; nothing tracks the upstream afterward. Subsequent plain `init` runs use the shipped defaults again, and re-initializing with a different or no profile is the same conflict-mediated flow as any re-init. No update mechanism exists, by design.

**Export.** `npx strikethroo export profile --destination-directory <dir>` (`src/export-profile.ts`) packages the current workspace: copies `config/` minus `schemas/` verbatim (full surface, not a diff against defaults), collects the manifest interactively (or via a programmatic `manifest` option), refuses a non-empty destination before any write, and validates the produced package against the same contract `init --profile` enforces — an export always round-trips.

**Provenance.** When a profile was imported, `.init-metadata.json` carries an optional `profile` field — `{ name, source, importedAt }` (`InitMetadata` in `src/types.ts`), `source` being the clone URL or absolute local package path. Display/forensics-only: nothing reads it for behavior, and `CURRENT_WORKSPACE_SCHEMA_VERSION` stays at `4` — a profiled workspace has the same shape as a plain one.

**Not `execution_routing.profiles`.** Strikethroo profiles are setup packages imported at `init`; `execution_routing.profiles` in `config/config.yaml` are task-routing execution profiles selected at dispatch time. Both exist, share nothing but the word, and must never blur — write "strikethroo profile" (or "setup profile") when meaning the former.

**Source**: `src/profiles.ts` (contract, validation, resolution, clone, staging), `src/export-profile.ts` (export flow), `src/index.ts` (init integration, profile section output, provenance recording), `ProfileError` in `src/types.ts`.

---

## Serve Feature (`src/serve/`)

The `serve` command (registered thinly in `src/cli.ts`; flags `--port <n>` default `4317`, `--no-open`, `--workspace <path>`) hosts a read-only workspace viewer (SPA + JSON API + SSE). It uses Node built-ins only — no runtime frontend dependency — and compiles via the main `tsc` pipeline into `dist/`.

- `workspace-model.ts` — pure, synchronous, side-effect-free data layer scanning `.ai/strikethroo/` and returning the stable JSON model (plan summaries/details, derived lifecycle state, tasks, inferred phases, mermaid blocks, `config/` hooks and templates). Reads only; reuses `findStrikethrooRoot`/`getAllPlans` from `src/skill-scripts/shared/`.
- `server.ts` — static SPA host (traversal protection, `index.html` fallback), the read-only JSON API, and platform-aware browser auto-open.
- `events.ts` + `watcher.ts` — `GET /api/events` SSE change stream backed by a debounced recursive `fs.watch`.
- `root.ts` — self-contained workspace resolver, shared with `validate`, that deliberately does **not** import across the `src/skill-scripts/**` build boundary. `resolveWorkspaceRoot` returns the absolute path of the `.ai/strikethroo` directory itself, or a user-facing `{ error }` — never a throw for the not-found case. Given `--workspace <path>` it tries the value two ways, in order: first as a **project** directory, validating `<path>/.ai/strikethroo/.init-metadata.json`; then as an initialized **workspace** directory itself, validating `<path>/.init-metadata.json`. Project semantics come first so every path that already resolved keeps its meaning, and the direct form only rescues paths that would otherwise error — it is what lets a command be pointed at a bare workspace tree such as the committed fixtures `src/__tests__/fixtures/serve-workspace` and `src/capture/fixtures/capture-workspace`, which hold `config/`, `plans/`, and `.init-metadata.json` at their top level with no `.ai/` above them. Without the flag it walks upward from the cwd testing each ancestor for `.ai/strikethroo/.init-metadata.json`.

### Sanctioned writes (exactly two)

Every route is read-only **except** these two guarded mutations; `POST /api/self-review` launches an external reviewer but writes nothing.

1. **Archive** (`archive.ts`, `POST /api/plans/:id/archive`) — for a plan that exists, lives under `plans/`, and is in derived `done` state: a single atomic directory rename into `archive/`, returning the refreshed model. Never deletes/edits, refuses to overwrite an existing destination, rejects non-`done` plans with a typed failure. UI surfaces it as a confirmation-gated **Archive** control on done plans only. Manual escape hatch — does not replace `st-execute-blueprint`'s automatic archival.
2. **Config write** (`config-write.ts`, `PUT /api/config/:kind/:id`, JSON `{ content }` body, `MAX_BODY_BYTES` 1 MiB) — overwrites a single existing config file in place, returning the refreshed config slice (`200`; `400` invalid kind/id, `404` no such file, `500` fs error). Strict allowlist: overwrite-only (target must exist); `kind` ∈ {`hooks`, `templates`} resolves `id` to one flat `config/<kind>/<id>.md` child with path-traversal/separator/`..` rejection, and the special `workspace` kind (only valid `id`: `config`) maps to the structured `config/config.yaml` behind the Customize Config form. Never creates/deletes/renames. `getConfig` surfaces hooks, templates (each with workspace-relative `relPath`), and the `workspace` ConfigFile (config.yaml, or null when absent).

### Plan-id routing

Both plan-id routes (`GET /api/plans/:id`, `POST /api/plans/:id/archive`) address a plan by its composite `{id}--{slug}` directory `name`, not the numeric frontmatter `id`. `parsePlanId`/`parseArchivePlanId` URL-decode the segment once and accept only the grammar `^[0-9]+--[a-z0-9-]+$` (rejecting empty, `/`, `\`, `..`, NUL, leading dot); resolution is by exact string match against `getAllPlans` enumeration — never by constructing a path from the segment, so the route is traversal-safe by construction. Bare numeric URLs (`/api/plans/28`) intentionally **no longer resolve** (invalid id → detail `404`, archive `400`); the numeric `id` is retained for display/sort only. Identical-`name` collisions resolve to the first match (`plans/` before `archive/`).

---

## Web SPA (`src/web/`)

React + Vite + Tailwind v4 SPA built by `npm run build:web` (`vite.config.mts`) into `dist-web/` — separate from the CLI's `tsc`/`dist/` domain.

**Data layer.** Screens consume the read-only API only through the fetch-only layer in `src/web/data/api.ts` (`usePlans`, `usePlanDetail`, `useConfig` over a `loading | error | data` resource); screens never fetch directly or carry mock data. Plan-scoped calls address plans by the composite `{id}--{slug}` `name` (canonical route `/plans/<id--slug>`); the task segment and `sort.ts` comparator stay numeric. Shared infrastructure: the hand-rolled History-API router (`router.tsx`), the `Sidebar` + `Chrome` shell (`App.tsx`, `components/`), and the presentational primitives (`StatusPill`, `Tickbox`, `Button`, `Chip`, `Modal` in `components/primitives.tsx`). `Chrome` takes breadcrumbs of `string | { label, href }` — `{ label, href }` navigates via the router, bare strings stay inert.

**Styling — utility-first Tailwind v4.** Components emit Tailwind utilities directly (composed through `cn()`), using the default scale plus a brand/status/signature token layer — **never arbitrary `[…]` values**. The foundation under `src/web/vendor/styles/` is five files: `index.css` (imports Tailwind, `@tailwindcss/typography`, `@custom-variant dark`, and the four below), `fonts.css` (self-hosted `@font-face`), `tokens.css` (the `@theme` block — cream/ink neutrals, dalia accent, `doing`/`done` status, `border`/`border-soft`/`border-strong`, `shadow-frame*`, `rounded-card`, Fraunces/Outfit fonts — plus the `.dark` token-swap), `base.css` (reset + base type), and `mermaid.css` (scoped rules for rendered-SVG internals). So `bg-cream`, `text-ink`, `text-dalia`, `bg-doing`, `border-border-soft`, `shadow-frame`, `rounded-card`, `font-display` are token-backed utilities.

**Screens.** Plans home (`plans/PlansRoute.tsx`) defaults to **Board** (switcher order Board, Cards). Archive (`archive/`) wires completed-date sort, a `from`/`to` date-range filter, and By-month grouping, composed search → date-range → sort → group (count and `archiveStats` reflect the filtered set); the client-side sort mechanism is `data/sort.ts` (`makeComparator`, `useTableSort` — new column defaults `desc`, re-click flips; callers supply column accessors, the module bakes in no screen knowledge). Plan Detail (`plans/detail/PlanDetailRoute.tsx`) has tabs **Plan, Graph, Tasks**: Plan's Reader (`PlanDetailReader.tsx`) is a flex two-column layout with prose left and the blueprint rail right (`lg:w-96 lg:shrink-0`), stacking under `lg`; Tasks renders the blueprint via the Swimlanes view (`plans/exec/`). Read-only blueprint rows are de-checkboxed (done = strikethrough). Task Detail (`/plans/:id/tasks/:taskId`, `TaskDetailRoute.tsx`) reuses the already-fetched `usePlanDetail(id)` payload (no new fetch), locates the task by numeric id, and renders its body through the shared `Section` renderer (from `ReaderProse.tsx`) so headings/`.crit`/mermaid render identically to plan sections, plus a metadata header (status pill, group/skills chips, dependency links). Blueprint task rows are clickable → Task Detail (inert without an `id`, via `plans/taskNav.ts`). The client `Task` type carries `body`/`file`/`sections`, serialized server-side via `sectionBody` in `scanTasks` (`src/serve/derivation.ts`).

**Single markdown/sanitization boundary.** All markdown rendering and HTML sanitization go through `src/web/render/markdown.ts` (`renderMarkdown(source)` → sanitized HTML, `marked` + DOMPurify forbidding `<script>`/`<style>`/`on*`). No screen may parse markdown or sanitize HTML on its own. Output is styled by Tailwind Typography (`prose dark:prose-invert max-w-none`). Mermaid is the sibling `src/web/render/mermaid.ts` path, reached **only** through a lazy dynamic `import()` so it is code-split out of consumers (the Reader ships no mermaid) and activated only by the Graph view; it cannot be themed by class alone, so Graph/Reader pass the resolved scheme to `renderMermaid(source, theme)` and re-render on theme change (`THEME_COLORS`; light passes no overrides). The CodeMirror editor (below) is a **distinct boundary** — raw editable source, never routed through sanitization, no preview.

**Customize section (`src/web/customize/`).** `/customize` (`CustomizeRoute.tsx`) calls `useConfig()` once, owns the `'hooks' | 'templates' | 'config'` tab state, and renders the same `ConfigCardGrid.tsx` for the first two tabs (responsive grid of card buttons, each `data-testid="config-card"`, navigating to `/customize/<kind>/<id>`). Descriptions come from the build-time registry `customize/descriptions.yaml` (imported via `@modyfi/vite-plugin-yaml`, merged by `id` once in `useConfig` via `descriptionFor`). The detail route (`/customize/:kind/:id`, `CustomizeDetailRoute.tsx`) reuses the `useConfig()` payload, mounts the lazy/code-split CodeMirror 6 editor `MarkdownEditor.tsx`, and persists via `saveConfigFile` (`PUT /api/config/:kind/:id`). The editor is theme-aware (`oneDark` when dark) and wires `markdown({ codeLanguages: languages })` for lazily-fetched per-fence highlighting. The **Config tab** (`WorkspaceConfigTab.tsx`) is the UI for setting up the generic `config/config.yaml`: a structured form (framed per feature section — today only `execution_routing`: profiles, ordered targets, optional resolver) whose single YAML boundary is `customize/configYaml.ts` (`parseWorkspaceConfig`/`serializeWorkspaceConfig`/`validateRoutingForm`, js-yaml bundled at build time). Saves go through `saveConfigFile('workspace', 'config', …)`, preserve foreign top-level sections structurally (comments are not preserved — the file and UI both say so), and are refused entirely when the routing section has a shape the form cannot represent.

**Theme (dark mode).** Class-based token swap, not media-query: a `.dark { … }` block in `tokens.css` redefines the `@theme` `--color-*` palette and signature shadows, so every token-backed utility re-themes when the single `.dark` class toggles on `document.documentElement`. The `@custom-variant dark (&:where(.dark, .dark *))` in `index.css` ties explicit `dark:` utilities to that same class. Single source of truth is `src/web/theme/theme.ts` (tri-state `Theme` `light | dark | system` default `system`, `localStorage` key `strikethroo-theme`, pure `parseTheme`/`resolveTheme`, guarded global wrappers). `ThemeProvider` (`theme/ThemeProvider.tsx`, outermost in `App.tsx`, `useTheme()`) holds the preference, applies it on mount/change, and re-applies on `prefers-color-scheme` changes **only while preference is `system`**. A small inline pre-paint guard in `index.html` mirrors the storage key + resolution rule to avoid a flash of light. The tri-state `ThemeToggle` lives in the Sidebar footer.

**No frontend runtime dependencies.** `serve` ships only the prebuilt static `dist-web/`, so the published package's runtime `dependencies` carry no frontend libraries. Vite, React, react-dom, Tailwind, `@tailwindcss/typography`, `@base-ui-components/react`, `lucide-react`, `mermaid`, `marked`, `dompurify`, `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, `@codemirror/theme-one-dark`, `@modyfi/vite-plugin-yaml`, and `js-yaml` (bundled into both the SPA and the skill `.cjs` bundles at build time) stay in `devDependencies` and **must never move to `dependencies`**.

---

## Capture Harness (`src/capture/`)

`src/capture/capture-web.ts` (run via `npm run capture:web`) produces the documentation visuals under `docs/assets/`. For repeatable output it serves the committed fixture workspace `src/capture/fixtures/capture-workspace/` through `serve`, drives the SPA with a real Chromium, and writes every asset. Override the workspace with `CAPTURE_WORKSPACE=<path>`. It is **not** part of `npm test` — a manual regeneration tool. To regenerate: `npm run build:web`, install Chromium (`npx playwright install --with-deps chromium`), then `npm run capture:web`.

---

## Workspace Validation (`src/validation/`)

`npx strikethroo validate [--workspace <path>] [--json]` (registered thinly in `src/cli.ts`, resolving the root through `serve`'s `resolveWorkspaceRoot`) reads a workspace and reports every **proven** internal inconsistency. It is read-only. Default output is one line per finding — `check`, then the path when the finding carries one, then the message — followed by a count; `--json` replaces that entirely with `JSON.stringify(result, null, 2)` on stdout, so a CI job can parse the stream whole. Exit is `0` only on a clean run that produced no findings; a finding, an unresolvable workspace, and an unexpected error all exit `1`.

**Purity contract.** `validateWorkspace(root)` in `workspace.ts` takes an *already-resolved* absolute path to the `.ai/strikethroo` directory and returns `{ findings }`. It performs no root discovery, writes nothing, prints nothing, and never calls `process.exit` — resolution, rendering, and the exit code belong to the CLI shell. That is what lets one implementation serve both the command and a CI job, and lets the core be exercised without spawning a process. `findStrikethrooRoot` from `src/skill-scripts/shared/root.ts` must never be used here: it terminates the process on a schema-version mismatch, which would kill the validator on precisely the workspace it is most useful against. Skew is reported as a finding instead.

**No severity axis.** `Finding` (`types.ts`) is `{ check, message, path? }`. Every finding is an error, so the exit rule is `findings.length > 0` and nothing else; re-introducing a severity axis is a scope change, not an implementation detail. `check` is a stable short identifier (`metadata/file-deleted`, `graph/dependency-cycle`, `identity/duplicate-plan-id`, …) that tests and downstream tooling assert on — rename only together with its consumers. `workspace.ts` sorts findings by `check`, then `path` (absent first), then `message`, because directory enumeration order is filesystem-dependent and CI runs on Windows.

**Scope: `plans/` only.** Content checks read `plans/`. An archived plan is immutable history, so a finding against one cannot be acted on and is noise by construction. `archive/` participates in exactly one check — `identity/duplicate-plan-id` — because continuous numbering across both trees is what stops a new plan from colliding with an archived one. `config/` templates are not swept either: the shipped task template carries literal placeholders (`status: "[STATUS]"`), so a workspace-wide Markdown pass would make a workspace report its own templates as broken.

**Metadata gate reports deletions, never hash drift.** `metadata-gate.ts` derives findings from `<root>/.init-metadata.json`: an unreadable, unparsable, or non-object file; a `workspaceSchemaVersion` other than `CURRENT_WORKSPACE_SCHEMA_VERSION`; an absent `files` map (which short-circuits the scan, since without a map there is nothing to compare); and every path recorded in `files` that is gone from disk. A hash *mismatch* is deliberately not a finding — it is how the tool detects **user modification**, the first-class protected state the whole hash-tracking mechanism exists to preserve, so reporting it would fire on every customized or profiled workspace.

**Check groups.** `strict-pass.ts` covers plan frontmatter (`id`, `summary`, `created`) and task frontmatter (`id`, `status` against its enum, `dependencies`, `skills`, and `complexity_score` when present, since it is required only on newly generated tasks), distinguishing an absent field from a present-but-malformed one. `graph-checks.ts` covers dangling dependency references, dependency cycles (DFS naming the participating ids, so the finding is actionable), blueprint/task consistency in both directions, disagreement between a task's frontmatter `id` and its filename prefix, task-id uniqueness within a plan, and plan-id uniqueness across `plans/` and `archive/`. `workspace.ts` only calls the groups and sorts — a new check goes inside its group's own file.

**Two frontmatter readers, two tolerance contracts — do not merge them.** `strict-pass.ts` hand-rolls its own reader instead of reusing the viewer's in `src/serve/markdown.ts`. The viewer's is lenient on purpose so a malformed plan still renders: it runs `parseInt` and leaves the field `undefined` on failure, making `id: abc` and a file with no `id:` line at all produce byte-identical results. Recovering exactly that missing-versus-malformed distinction is the strict pass's reason to exist. Enumeration is hand-rolled for the same reason: the shared plan-scan helpers drop any plan whose `id` will not parse, and are therefore structurally incapable of reporting the plans most likely to be broken. Both readers are correct for their own consumer; neither is a deduplication candidate.

**Import boundary.** Nothing under `src/skill-scripts/` may import `src/validation/` — the skill entrypoints are bundled whole by esbuild, so a single edge would land the validator in every skill `.cjs`. The dependency runs the other way and only that way: `src/validation/` reuses `validateComplexityScore` and `getAllPlans` from `src/skill-scripts/shared/`, and `extractBody`, `scanTasks`, and `parseBlueprintPhases` from `src/serve/`.

---

## Build Pipeline

`npm run build` = `tsc && npm run build:web && npm run build:skills && npm run build:skill-prompts`:

1. `tsc` compiles the CLI domain (including `src/serve/`) into `dist/`.
2. `build:web` (`vite build`) compiles `src/web/` into `dist-web/` — the static assets `serve` hosts.
3. `build:skills` (`scripts/build-skills.cjs`, esbuild) bundles each registered entrypoint into a self-contained `.cjs` emitted directly into `templates/harness/skills/<skill>/scripts/`.
4. `build:skill-prompts` (`scripts/build-skill-prompts.cjs`) compiles the Handlebars sources into `templates/harness/skills/<name>/SKILL.md`. It writes only those files. Validation rejects unresolved markers, invalid frontmatter, and missing `## Operating Procedure` headings.

**Adding a skill:** add its TypeScript entrypoint to `src/skill-scripts/` and `SKILL_ENTRYPOINTS`, add it to `.claude-plugin/plugin.json`, and create `src/skill-prompts/skills/<name>/SKILL.md.hbs` with `name` and `description` frontmatter.

**`templates/harness/skills/` is gitignored, untracked local build output.** `npm run build` overwrites it wholesale on every run and nothing commits it; the npm tarball packs it from disk at publish time (`package.json`'s `files` allowlist), and `init` never reads it. The tracked root `skills/` mirror is a separate generated artifact with a different writer: see [Distribution](#distribution) for the mirror itself, and `node scripts/sync-skills-mirror.cjs`, run only by the release workflow, for how it is populated. `dist-web/` ships only in the npm package.

**Never hand-edit or hand-commit either generated tree.** Edit `src/skill-prompts/` for prompts and `src/skill-scripts/` for bundles — both `templates/harness/skills/` and the root `skills/` mirror are overwritten wholesale by the build or the mirror sync, so a hand-made change disappears at the next run. Two guards enforce this:

- `.husky/pre-commit` rejects staged changes to `templates/harness/skills/*/SKILL.md`, `templates/harness/skills/*/scripts/*.cjs`, `skills/*/SKILL.md`, and `skills/*/scripts/*.cjs`, and names the source directory to edit instead. The release workflow runs with `HUSKY=0`, so the guard never blocks the release commit that legitimately writes the mirror.
- `.gitattributes` marks all four path patterns `linguist-generated=true` (and the vendored `config/schemas/*.xsd` `linguist-vendored=true`). GitHub collapses them in pull requests, and the code review gate reads the same markers to drop them from the reviewed diff.

A local `npm run build` therefore never dirties Git status: `templates/harness/skills/` is ignored, and the root `skills/` mirror is untouched by the build. Only the release workflow's sync step changes the mirror.

---

## Distribution

Two channels ship skill content, and neither reads the other:

- **npm tarball** — `package.json`'s `files` allowlist (`dist/`, `dist-web/`, `templates/`, `LICENSE`) packs `templates/` for `init`'s workspace, agent, and template needs. `templates/harness/skills/` rides along inside that tree but `init` never installs skills from it; only `templates/strikethroo/` (workspace) and `templates/harness/agents/` (per-harness sub-agents) are read at init time.
- **Git tree** — [vercel-labs/skills](https://github.com/vercel-labs/skills)' bare installer (`npx skills add e0ipso/strikethroo`) reads the repository directly. It walks a root `skills/` directory up to three levels deep, ahead of every per-harness project directory and of `.claude-plugin/plugin.json`, keeping the first skill found per name. Strikethroo tracks that discovery target as the root `skills/` mirror — the seven `st-*` skill directories checked into Git. `#<git-ref>` selects a standard branch or tag on the same repository, so a valid install at any ref requires a complete mirror at that ref. `.claude-plugin/plugin.json` still lists the same seven skills at `./skills/st-*` for Claude plugin tooling that reads the manifest directly; it is redundant for the upstream installer's own discovery.

The mirror is release-only content: `scripts/sync-skills-mirror.cjs` replaces `skills/` with the just-built `templates/harness/skills/` tree and verifies byte-for-byte parity, the release workflow runs it after the build-and-test gate and before `npx semantic-release`, and `@semantic-release/git` stages the result as `skills/**` into the tagged release commit. No other step writes to `skills/` — `npm run build` never calls the sync script, so only release automation is a normal writer of the mirror. See [Build Pipeline](#build-pipeline) for the guards (`.gitattributes`, `.husky/pre-commit`) that reject a hand-staged change to either generated tree.

---

## Schema Version Contract

`.ai/strikethroo/.init-metadata.json` carries `workspaceSchemaVersion` (current `4`), distinct from the CLI's `version` string. It changes only when the workspace shape (hook names, required templates, directory structure) changes incompatibly. Single source of truth: `CURRENT_WORKSPACE_SCHEMA_VERSION` in `src/metadata.ts`. Upgrade path: re-run `npx strikethroo init`.

Skills bake `EXPECTED_WORKSPACE_SCHEMA_VERSION` into each `.cjs` via esbuild's `define`. At runtime `src/skill-scripts/shared/root.ts` compares the workspace value against the baked value:

- **Workspace older than skill:** re-run `npx strikethroo init` with the latest CLI.
- **Workspace newer than skill:** re-run `npx skills add e0ipso/strikethroo` to update skills.

Absent values in older metadata are backfilled to `1` on read (both sides), so deployed workspaces aren't broken by the field's introduction. Bump the constant only on genuine incompatible shape changes; the upgrade path is re-running `init` (no `migrate` subcommand). A post-build smoke assertion in `build-skills.cjs` fails the build if the literal `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives substitution into any bundle.

---

## GitHub Releases

`semantic-release` via `.github/workflows/release.yml`, triggered on push to `main`. The workflow runs `npm ci && npm run build && npx playwright install --with-deps chromium && npm test` (the browser install is needed because `npm test`'s e2e half runs against a real Chromium), then `node scripts/sync-skills-mirror.cjs` to replace and parity-verify the root `skills/` mirror from the fresh build, then `npx semantic-release` with `HUSKY=0` (analyze commits → bump → publish to npm → GitHub release + tag). The `@semantic-release/git` `assets` list is `CHANGELOG.md`, `package.json`, `package-lock.json`, and `skills/**`; `templates/harness/skills/` and `dist-web/` are deliberately excluded — the templates tree is gitignored local build output that ships only through the npm tarball, and the SPA ships only through npm. Release commits are labeled `chore(release):` and carry `[skip ci]`.

Verify the invariant:

```bash
git ls-files 'templates/harness/skills/*/SKILL.md' 'templates/harness/skills/*/scripts/*.cjs'  # expect: EMPTY (never tracked)
git ls-files 'skills/*/SKILL.md' | wc -l                                                        # expect: 7 (mirror tracked, one per skill)
npm pack --dry-run 2>&1 | grep -c 'templates/harness/skills/.*SKILL\.md'                        # expect: 7 (npm channel unchanged)
npm pack --dry-run 2>&1 | awk '{print $NF}' | grep -c '^skills/'                                # expect: 0 (mirror is Git-tree only, never packed)
```

`npm pack --dry-run`'s tarball listing is written to stderr, so `2>&1` is required — a bare `| grep` silently matches nothing.

---

## Directory Structure

```
project/
├── .ai/strikethroo/               # Shared workspace (harness-agnostic)
│   ├── plans/                     # Active plans
│   │   └── 28--plan-name/
│   │       ├── plan-28--plan-name.md
│   │       ├── tasks/
│   │       │   ├── 01--task-one.md
│   │       │   └── 02--task-two.md
│   │       └── review/            # Code review artifacts (base-commit.json, review.xml,
│   │                              #   reviewer-output.txt on failure); gitignored by the workspace
│   ├── archive/                   # Completed plans
│   ├── config/
│   │   ├── STRIKETHROO.md         # Project context
│   │   ├── config.yaml            # Local, workspace-gitignored configuration; exact external
│   │   │                          #   harness cli_args plus active execution-routing profiles;
│   │   │                          #   init-created/hash-tracked and editable via Customize
│   │   ├── hooks/                 # PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT,
│   │   │                          #   PRE_TASK_EXECUTION (ships a default, overridable TDD red-green-refactor
│   │   │                          #   discipline that defers to the test philosophy), TASK_EXECUTION_ROUTING
│   │   │                          #   (in-context profile classification during task generation;
│   │   │                          #   dispatch-time selection/probing follows the persisted profile),
│   │   │                          #   POST_TASK_GENERATION_ALL, POST_EXECUTION, CODE_REVIEW
│   │   │                          #   (terminal review gate), POST_ERROR_DETECTION
│   │   ├── schemas/               # vendored self-review-v2.xsd (XSD 1.0, namespace urn:self-review:v2,
│   │   │                          #   copied by init with hash tracking)
│   │   ├── shared/                # Cross-skill disciplines read at runtime: verification-gate.md,
│   │   │                          #   clarification-gate.md, anti-rationalization.md
│   │   └── templates/             # PLAN_TEMPLATE.md, TASK_TEMPLATE.md, BLUEPRINT_TEMPLATE.md,
│   │                              #   EXECUTION_SUMMARY_TEMPLATE.md
│   ├── .gitignore                 # Covers plans/*/review/, archive/*/review/, and runtime/.
│   │                              #   Shipped as templates/strikethroo/gitignore and renamed on
│   │                              #   copy — npm drops or renames a literal .gitignore in transit,
│   │                              #   so nothing under templates/ may carry that name.
│   └── runtime/                   # Gitignored dispatch cache (30m available / 5m unavailable)
└── .claude/agents/                # Claude-only sub-agents copied by `init`
```

Manual archival after completion: `mv .ai/strikethroo/plans/25--completed-plan .ai/strikethroo/archive/`. Continuous ID numbering across active + archived plans prevents conflicts.

---

## Testing

Unit/integration on **Vitest** (`npm run test:unit` — `vitest run --coverage`, node env, v8 coverage gate: branches 19 / functions 12 / lines 24 / statements 24); e2e on **@playwright/test** (`npm run test:e2e`) against the prebuilt `dist-web/` with a real Chromium. `npm test` chains them (`test:unit && test:e2e`) so unit failures short-circuit. **Install browsers first:** `npx playwright install --with-deps chromium`. Config: `vitest.config.ts`, `playwright.config.ts` (no Jest). Example unit suites: `src/__tests__/utils.test.ts`, `cli.integration.test.ts`, `get-next-plan-id.test.ts`.

Security/maintenance scripts: `npm run security:audit` (`-json`, `:fix`, `:fix-force`), `npm run prepublishOnly` (auto-runs pre-publish).

---

## Templates

Four base templates live at `templates/strikethroo/config/templates/`, and `init` copies all four into the workspace: `PLAN_TEMPLATE.md`, `TASK_TEMPLATE.md`, `BLUEPRINT_TEMPLATE.md`, and `EXECUTION_SUMMARY_TEMPLATE.md`. When customizing: preserve the YAML frontmatter format and core metadata fields; use lowercase bash variables (`task_count`, `plan_id`) — `$ARGUMENTS` and `$1` are placeholder exceptions. Validate with `npm run build && node dist/cli.js init --harnesses claude --destination-directory /tmp/test`.

**Plan frontmatter:** `id`, `summary`, `created`. **Plan sections**, in template order: Original Work Order, Plan Clarifications (present only when clarifications were necessary), Executive Summary, Context, Architectural Approach, Risk Considerations and Mitigation Strategies, Success Criteria, Self Validation, Documentation, Resource Requirements, Integration Strategy, Notes. The templates are user-editable and wholesale replaceable by a strikethroo profile, so this list describes the shipped default; nothing machine-readable asserts it.

**Task frontmatter:** `id`, `group`, `dependencies`, `status`, `created`, `skills`, `complexity_score` (required on every newly generated task), and optionally `complexity_notes` and `execution_profile`. The two optional fields reach a task from different places: `complexity_notes` is written by the task-generation skills when a score needs justifying, while `execution_profile` is written only by `route-task-execution.cjs` after it validates the whole task-to-profile mapping — never by hand. `TASK_TEMPLATE.md` carries `execution_profile` as a commented-out line for that reason, and does not mention `complexity_notes` at all. **Task sections:** Objective, Skills Required, Acceptance Criteria, Technical Requirements, Input Dependencies, Output Artifacts, Implementation Notes.

---

## Error Handling

Custom error classes (`src/types.ts`): `FileSystemError`, `ConfigError`, `TemplateError`, `HarnessError`. Template-processing errors usually mean malformed frontmatter or missing variables — check syntax and variable names. Schema-version mismatches: read the error — it names the direction and the fix (see Schema Version Contract).

---

## Cursor Cloud specific instructions

When developing in a Cursor Cloud Agent VM, read [`.cursor/cloud-instructions.md`](.cursor/cloud-instructions.md) for environment setup and run caveats (build-before-run, the `serve` workspace requirement, e2e browser install). Load it on demand — it is not needed for routine local work.

<!-- >>> kenkeep:kk-index >>> -->
You are required to load [.ai/kenkeep/ENTRY.md](.ai/kenkeep/ENTRY.md), the small curated entry catalog for this repo. Enter there and descend using progressive disclosure principles.


<!-- <<< kenkeep:kk-index <<< -->
