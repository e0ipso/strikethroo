# AGENTS.md

Primary context source for AI-assisted work in this repository.

## Quick Start

```bash
# Build, then run init or serve
npm run build
npm start init --harnesses claude --destination-directory /path/to/project   # --force to overwrite all
node dist/cli.js serve                                                       # or: npx strikethroo serve

# Development
npm run dev           # Watch mode compilation
npm test              # Full gate: unit (Vitest) then e2e (@playwright/test)
npm run lint:fix      # Auto-fix style
```

`init` bootstraps the `.ai/strikethroo/` workspace (and copies Claude agents); it does **not** install skills. It uses SHA-256 hash tracking in `.ai/strikethroo/.init-metadata.json` to detect and protect user-modified files; `--force` bypasses the prompts for automation.

The workflow itself ships as **Agent Skills** (harness-agnostic — one `SKILL.md` works on any harness supporting the format). Install once with `npx skills add e0ipso/strikethroo` (append `@<tag>` to pin); the matching skill auto-loads on intent.

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

### Key Design Principles

- **Atomic decomposition** — max 2 skills per task (3+ triggers subdivision); automatic skill inference; explicit dependency mapping.
- **Scope control (YAGNI)** — anti-pattern enumeration, "Is this explicitly mentioned?" validation, 20-30% minimization targets, every task traceable to an explicit requirement.
- **Test philosophy: "Write a few tests, mostly integration"** — selective meaningful coverage over completeness; real filesystem operations over mocking; focus on custom logic, critical workflows, and edge cases; don't test third-party/framework features, trivial getters/setters, or obvious CRUD.

---

## Skills Layer

Skills live under `templates/harness/skills/<name>/` (no top-level `skills/` dir; flat, no nesting). Each skill's `SKILL.md` and its compiled `.cjs` bundle under `scripts/` are assembled/bundled at build time — source and output share the same per-skill tree.

The six shipping skills are the workflow skills listed above (`st-create-plan`, `st-generate-tasks`, `st-execute-blueprint`, `st-refine-plan`, `st-execute-task`, `st-full-workflow`).

### TypeScript source of truth

Runtime logic each skill needs is authored once in TypeScript under `src/skill-scripts/`, with shared helpers (frontmatter parsing, plan/archive scanning, root discovery) in `src/skill-scripts/shared/`. The subtree type-checks via `tsconfig.skill-scripts.json` and lints with `src/`, but its output is produced by the bundler — the main `tsconfig.json` excludes `src/skill-scripts/**` from emit so `dist/` stays the CLI's domain.

### Prompt source of truth

Each `SKILL.md` is assembled at build time from source templates in `src/skill-prompts/`. Shared procedural blocks live in `src/skill-prompts/sections/`, referenced via `{{include sections/<name>.md}}`; per-skill differences use `{{variable}}` substitution from the template's frontmatter `vars` block. See `src/skill-prompts/README.md` for assembly mechanics and `src/skill-prompts/AUTHORING.md` for the prompt-authoring house style (form-over-narrative, "no nuance clauses", anti-rationalization tables, Skill Discovery Optimization for descriptions, imperative phrasing) — read it before editing prompt content.

Enforcement disciplines shared **across** skills are not baked into each `SKILL.md`; they ship as required, project-customizable files under `config/shared/` (copied into the workspace by `init`, hash-tracked like hooks) and the skills read them **at runtime**. The three files: `verification-gate.md` (evidence-before-claims gate, applied at `st-execute-blueprint`/`st-full-workflow` phase-completion and post-execution), `clarification-gate.md` (one-question-at-a-time, multiple-choice-first, pre-emit approval, used by `st-create-plan`/`st-refine-plan`), and `anti-rationalization.md` (the excuse → red-flag framing; each consuming skill — `st-create-plan`, `st-generate-tasks`, `st-execute-blueprint` — supplies its own skill-specific rationalization table inline and points the agent at this shared framing). Because these files are required workspace shape, `CURRENT_WORKSPACE_SCHEMA_VERSION` is bumped; older workspaces must rerun `npx strikethroo init` before using updated skills. This mirrors how the `PRE_TASK_EXECUTION` TDD hook is shared.

---

## Serve Feature (`src/serve/`)

The `serve` command (registered thinly in `src/cli.ts`; flags `--port <n>` default `4317`, `--no-open`, `--workspace <path>`) hosts a read-only workspace viewer (SPA + JSON API + SSE). It uses Node built-ins only — no runtime frontend dependency — and compiles via the main `tsc` pipeline into `dist/`.

- `workspace-model.ts` — pure, synchronous, side-effect-free data layer scanning `.ai/strikethroo/` and returning the stable JSON model (plan summaries/details, derived lifecycle state, tasks, inferred phases, mermaid blocks, `config/` hooks and templates). Reads only; reuses `findStrikethrooRoot`/`getAllPlans` from `src/skill-scripts/shared/`.
- `server.ts` — static SPA host (traversal protection, `index.html` fallback), the read-only JSON API, and platform-aware browser auto-open.
- `events.ts` + `watcher.ts` — `GET /api/events` SSE change stream backed by a debounced recursive `fs.watch`.
- `root.ts` — self-contained workspace resolver that deliberately does **not** import across the `src/skill-scripts/**` build boundary.

### Sanctioned writes (exactly two)

Every route is read-only **except** these two guarded mutations; `POST /api/self-review` launches an external reviewer but writes nothing.

1. **Archive** (`archive.ts`, `POST /api/plans/:id/archive`) — for a plan that exists, lives under `plans/`, and is in derived `done` state: a single atomic directory rename into `archive/`, returning the refreshed model. Never deletes/edits, refuses to overwrite an existing destination, rejects non-`done` plans with a typed failure. UI surfaces it as a confirmation-gated **Archive** control on done plans only. Manual escape hatch — does not replace `st-execute-blueprint`'s automatic archival.
2. **Config write** (`config-write.ts`, `PUT /api/config/:kind/:id`, JSON `{ content }` body, `MAX_BODY_BYTES` 1 MiB) — overwrites a single existing hook or template file in place, returning the refreshed config slice (`200`; `400` invalid kind/id, `404` no such file, `500` fs error). Strict allowlist: overwrite-only (target must exist), `kind` ∈ {`hooks`, `templates`}, `id` resolved to one flat `config/<kind>/<id>.md` child with path-traversal/separator/`..` rejection. Never creates/deletes/renames. `getConfig` surfaces each file's workspace-relative `relPath` on `ConfigFile` to support the editor.

### Plan-id routing

Both plan-id routes (`GET /api/plans/:id`, `POST /api/plans/:id/archive`) address a plan by its composite `{id}--{slug}` directory `name`, not the numeric frontmatter `id`. `parsePlanId`/`parseArchivePlanId` URL-decode the segment once and accept only the grammar `^[0-9]+--[a-z0-9-]+$` (rejecting empty, `/`, `\`, `..`, NUL, leading dot); resolution is by exact string match against `getAllPlans` enumeration — never by constructing a path from the segment, so the route is traversal-safe by construction. Bare numeric URLs (`/api/plans/28`) intentionally **no longer resolve** (invalid id → detail `404`, archive `400`); the numeric `id` is retained for display/sort only. Identical-`name` collisions resolve to the first match (`plans/` before `archive/`).

---

## Web SPA (`src/web/`)

React + Vite + Tailwind v4 SPA built by `npm run build:web` (`vite.config.mts`) into `dist-web/` — separate from the CLI's `tsc`/`dist/` domain.

**Data layer.** Screens consume the read-only API only through the fetch-only layer in `src/web/data/api.ts` (`usePlans`, `usePlanDetail`, `useConfig` over a `loading | error | data` resource); screens never fetch directly or carry mock data. Plan-scoped calls address plans by the composite `{id}--{slug}` `name` (canonical route `/plans/<id--slug>`); the task segment and `sort.ts` comparator stay numeric. Shared infrastructure: the hand-rolled History-API router (`router.tsx`), the `Sidebar` + `Chrome` shell (`App.tsx`, `components/`), and the presentational primitives (`StatusPill`, `Tickbox`, `Button`, `Chip`, `Modal` in `components/primitives.tsx`). `Chrome` takes breadcrumbs of `string | { label, href }` — `{ label, href }` navigates via the router, bare strings stay inert.

**Styling — utility-first Tailwind v4.** Components emit Tailwind utilities directly (composed through `cn()`), using the default scale plus a brand/status/signature token layer — **never arbitrary `[…]` values**. The foundation under `src/web/vendor/styles/` is five files: `index.css` (imports Tailwind, `@tailwindcss/typography`, `@custom-variant dark`, and the four below), `fonts.css` (self-hosted `@font-face`), `tokens.css` (the `@theme` block — cream/ink neutrals, dalia accent, `doing`/`done` status, `border`/`border-soft`/`border-strong`, `shadow-frame*`, `rounded-card`, Fraunces/Outfit fonts — plus the `.dark` token-swap), `base.css` (reset + base type), and `mermaid.css` (scoped rules for rendered-SVG internals). So `bg-cream`, `text-ink`, `text-dalia`, `bg-doing`, `border-border-soft`, `shadow-frame`, `rounded-card`, `font-display` are token-backed utilities.

**Screens.** Plans home (`plans/PlansRoute.tsx`) defaults to **Board** (switcher order Board, Cards). Archive (`archive/`) wires completed-date sort, a `from`/`to` date-range filter, and By-month grouping, composed search → date-range → sort → group (count and `archiveStats` reflect the filtered set); the client-side sort mechanism is `data/sort.ts` (`makeComparator`, `useTableSort` — new column defaults `desc`, re-click flips; callers supply column accessors, the module bakes in no screen knowledge). Plan Detail (`plans/detail/PlanDetailRoute.tsx`) has tabs **Plan, Graph, Tasks**: Plan's Reader (`PlanDetailReader.tsx`) is a flex two-column layout with prose left and the blueprint rail right (`lg:w-96 lg:shrink-0`), stacking under `lg`; Tasks renders the blueprint via the Swimlanes view (`plans/exec/`). Read-only blueprint rows are de-checkboxed (done = strikethrough). Task Detail (`/plans/:id/tasks/:taskId`, `TaskDetailRoute.tsx`) reuses the already-fetched `usePlanDetail(id)` payload (no new fetch), locates the task by numeric id, and renders its body through the shared `Section` renderer (from `ReaderProse.tsx`) so headings/`.crit`/mermaid render identically to plan sections, plus a metadata header (status pill, group/skills chips, dependency links). Blueprint task rows are clickable → Task Detail (inert without an `id`, via `plans/taskNav.ts`). The client `Task` type carries `body`/`file`/`sections`, serialized server-side via `sectionBody` in `scanTasks` (`src/serve/derivation.ts`).

**Single markdown/sanitization boundary.** All markdown rendering and HTML sanitization go through `src/web/render/markdown.ts` (`renderMarkdown(source)` → sanitized HTML, `marked` + DOMPurify forbidding `<script>`/`<style>`/`on*`). No screen may parse markdown or sanitize HTML on its own. Output is styled by Tailwind Typography (`prose dark:prose-invert max-w-none`). Mermaid is the sibling `src/web/render/mermaid.ts` path, reached **only** through a lazy dynamic `import()` so it is code-split out of consumers (the Reader ships no mermaid) and activated only by the Graph view; it cannot be themed by class alone, so Graph/Reader pass the resolved scheme to `renderMermaid(source, theme)` and re-render on theme change (`THEME_COLORS`; light passes no overrides). The CodeMirror editor (below) is a **distinct boundary** — raw editable source, never routed through sanitization, no preview.

**Customize section (`src/web/customize/`).** `/customize` (`CustomizeRoute.tsx`) calls `useConfig()` once, owns the `'hooks' | 'templates'` tab state, and renders the same `ConfigCardGrid.tsx` for both tabs (responsive grid of card buttons, each `data-testid="config-card"`, navigating to `/customize/<kind>/<id>`). Descriptions come from the build-time registry `customize/descriptions.yaml` (imported via `@modyfi/vite-plugin-yaml`, merged by `id` once in `useConfig` via `descriptionFor`). The detail route (`/customize/:kind/:id`, `CustomizeDetailRoute.tsx`) reuses the `useConfig()` payload, mounts the lazy/code-split CodeMirror 6 editor `MarkdownEditor.tsx`, and persists via `saveConfigFile` (`PUT /api/config/:kind/:id`). The editor is theme-aware (`oneDark` when dark) and wires `markdown({ codeLanguages: languages })` for lazily-fetched per-fence highlighting.

**Theme (dark mode).** Class-based token swap, not media-query: a `.dark { … }` block in `tokens.css` redefines the `@theme` `--color-*` palette and signature shadows, so every token-backed utility re-themes when the single `.dark` class toggles on `document.documentElement`. The `@custom-variant dark (&:where(.dark, .dark *))` in `index.css` ties explicit `dark:` utilities to that same class. Single source of truth is `src/web/theme/theme.ts` (tri-state `Theme` `light | dark | system` default `system`, `localStorage` key `strikethroo-theme`, pure `parseTheme`/`resolveTheme`, guarded global wrappers). `ThemeProvider` (`theme/ThemeProvider.tsx`, outermost in `App.tsx`, `useTheme()`) holds the preference, applies it on mount/change, and re-applies on `prefers-color-scheme` changes **only while preference is `system`**. A small inline pre-paint guard in `index.html` mirrors the storage key + resolution rule to avoid a flash of light. The tri-state `ThemeToggle` lives in the Sidebar footer.

**No frontend runtime dependencies.** `serve` ships only the prebuilt static `dist-web/`, so the published package's runtime `dependencies` carry no frontend libraries. Vite, React, react-dom, Tailwind, `@tailwindcss/typography`, `@base-ui-components/react`, `lucide-react`, `mermaid`, `marked`, `dompurify`, `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, `@codemirror/theme-one-dark`, and `@modyfi/vite-plugin-yaml` stay in `devDependencies` and **must never move to `dependencies`**.

---

## Capture Harness (`src/capture/`)

`src/capture/capture-web.ts` (run via `npm run capture:web`) produces the documentation visuals under `docs/assets/`. For repeatable output it serves the committed fixture workspace `src/capture/fixtures/capture-workspace/` through `serve`, drives the SPA with a real Chromium, and writes every asset. Override the workspace with `CAPTURE_WORKSPACE=<path>`. It is **not** part of `npm test` — a manual regeneration tool. To regenerate: `npm run build:web`, install Chromium (`npx playwright install --with-deps chromium`), then `npm run capture:web`.

---

## Build Pipeline

`npm run build` = `tsc && npm run build:web && npm run build:skills && npm run build:skill-prompts`:

1. `tsc` compiles the CLI domain (including `src/serve/`) into `dist/`.
2. `build:web` (`vite build`) compiles `src/web/` into `dist-web/` — the static assets `serve` hosts.
3. `build:skills` (`scripts/build-skills.cjs`, esbuild) bundles each registered entrypoint into a self-contained `.cjs` emitted directly into `templates/harness/skills/<skill>/scripts/`.
4. `build:skill-prompts` (`scripts/build-skill-prompts.cjs`) resolves `{{include}}`/`{{variable}}` directives, writing assembled `SKILL.md` files. Post-build validation fails on unresolved directives, missing frontmatter, or absent `## Operating Procedure` headings.

**Adding a skill:** drop a TS entrypoint under `src/skill-scripts/`, add it to `SKILL_ENTRYPOINTS` (top of `build-skills.cjs`), add the path to `.claude-plugin/plugin.json`, create a source template in `src/skill-prompts/`. No other plumbing needed.

**Generated artifacts force-added into the release commit** by `@semantic-release/git` (via `git add --force`, since they are git-ignored on `main`): the `.cjs` bundles under `templates/harness/skills/*/scripts/` and the assembled `SKILL.md` files under `templates/harness/skills/*/`. These must live at the tagged ref because `npx skills add e0ipso/strikethroo@<tag>` reads `templates/` directly from it. The prebuilt SPA `dist-web/` is **not** committed to git — it ships only via the npm package's `files: ["dist-web/"]` entry, built fresh by `prepublishOnly`/CI. Skill bundles/prompts also ship via `files: ["templates/"]`.

---

## Distribution

Skills are distributed via [vercel-labs/skills](https://github.com/vercel-labs/skills), which reads `.claude-plugin/plugin.json` at the repo root — a JSON manifest whose `skills:` array lists `./templates/harness/skills/<name>` entries (leading `./` required). Users run `npx skills add e0ipso/strikethroo` (`@<tag>` to pin), and the installer reads the tagged release ref.

Note the two sibling directories under `templates/harness/`: `skills/` is install-time content read by `npx skills add`; `agents/` is init-time content copied into `.claude/agents/` by `npx . init`. The CLI's `init` does not read `skills/`.

---

## Schema Version Contract

`.ai/strikethroo/.init-metadata.json` carries `workspaceSchemaVersion` (current `3`), distinct from the CLI's `version` string. It changes only when the workspace shape (hook names, required templates, directory structure) changes incompatibly. Single source of truth: `CURRENT_WORKSPACE_SCHEMA_VERSION` in `src/metadata.ts`.

Skills bake `EXPECTED_WORKSPACE_SCHEMA_VERSION` into each `.cjs` via esbuild's `define`. At runtime `src/skill-scripts/shared/root.ts` compares the workspace value against the baked value:

- **Workspace older than skill:** re-run `npx strikethroo init` with the latest CLI.
- **Workspace newer than skill:** re-run `npx skills add e0ipso/strikethroo` to update skills.

Absent values in older metadata are backfilled to `1` on read (both sides), so deployed workspaces aren't broken by the field's introduction. Bump the constant only on genuine incompatible shape changes; the upgrade path is re-running `init` (no `migrate` subcommand). A post-build smoke assertion in `build-skills.cjs` fails the build if the literal `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives substitution into any bundle.

---

## GitHub Releases

`semantic-release` via `.github/workflows/release.yml`, triggered on push to `main`. The workflow runs `npm ci && npm run build && npx playwright install --with-deps chromium && npm test` (the browser install is needed because `npm test`'s e2e half runs against a real Chromium), then `npx semantic-release` (analyze commits → bump → publish to npm → GitHub release + tag). The `@semantic-release/git` `assets` glob force-adds `templates/harness/skills/*/scripts/*.cjs` and `templates/harness/skills/*/SKILL.md`; `dist-web/` is deliberately **not** in the glob. Release commits are labeled `chore(release):` and carry `[skip ci]`.

Verify the invariant:

```bash
git ls-tree -r v<tag> -- 'templates/harness/skills/*/scripts/*.cjs'   # expect: bundles listed
git ls-tree -r v<tag> -- 'templates/harness/skills/*/SKILL.md'        # expect: prompts listed
git ls-tree -r v<tag> -- 'dist-web/*'                                 # expect: EMPTY (SPA ships via npm)
npm pack --dry-run | grep dist-web                                    # expect: SPA assets in the tarball
```

---

## Directory Structure

```
project/
├── .ai/strikethroo/               # Shared workspace (harness-agnostic)
│   ├── plans/                     # Active plans
│   │   └── 28--plan-name/
│   │       ├── plan-28--plan-name.md
│   │       └── tasks/
│   │           ├── 01--task-one.md
│   │           └── 02--task-two.md
│   ├── archive/                   # Completed plans
│   ├── config/
│   │   ├── STRIKETHROO.md         # Project context
│   │   ├── hooks/                 # PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT,
│   │   │                          #   PRE_TASK_EXECUTION (ships a default, overridable TDD red-green-refactor
│   │   │                          #   discipline that defers to the test philosophy), POST_TASK_GENERATION_ALL,
│   │   │                          #   POST_EXECUTION, POST_ERROR_DETECTION
│   │   ├── shared/                # Cross-skill disciplines read at runtime: verification-gate.md,
│   │   │                          #   clarification-gate.md, anti-rationalization.md
│   │   └── templates/             # PLAN_TEMPLATE.md, TASK_TEMPLATE.md
└── .claude/agents/                # Claude-only sub-agents copied by `init`
```

Manual archival after completion: `mv .ai/strikethroo/plans/25--completed-plan .ai/strikethroo/archive/`. Continuous ID numbering across active + archived plans prevents conflicts.

---

## Testing

Unit/integration on **Vitest** (`npm run test:unit` — `vitest run --coverage`, node env, v8 coverage gate: branches 19 / functions 12 / lines 24 / statements 24); e2e on **@playwright/test** (`npm run test:e2e`) against the prebuilt `dist-web/` with a real Chromium. `npm test` chains them (`test:unit && test:e2e`) so unit failures short-circuit. **Install browsers first:** `npx playwright install --with-deps chromium`. Config: `vitest.config.ts`, `playwright.config.ts` (no Jest). Example unit suites: `src/__tests__/utils.test.ts`, `cli.integration.test.ts`, `get-next-plan-id.test.ts`.

Security/maintenance scripts: `npm run security:audit` (`-json`, `:fix`, `:fix-force`), `npm run prepublishOnly` (auto-runs pre-publish).

---

## Templates

Base templates live at `templates/strikethroo/config/templates/{PLAN,TASK}_TEMPLATE.md`. When customizing: preserve the YAML frontmatter format and core metadata fields; use lowercase bash variables (`task_count`, `plan_id`) — `$ARGUMENTS` and `$1` are placeholder exceptions. Validate with `npm run build && node dist/cli.js init --harnesses claude --destination-directory /tmp/test`.

**Plan frontmatter:** `id`, `summary`, `created`. **Plan sections:** Original Work Order, Plan Clarifications, Executive Summary, Context and Background, Technical Implementation Approach, Risk Considerations, Success Criteria, Resource Requirements.

**Task frontmatter:** `id`, `group`, `dependencies`, `status`, `created`, `skills`. **Task sections:** Objective, Skills Required, Acceptance Criteria, Technical Requirements, Input Dependencies, Output Artifacts, Implementation Notes.

---

## Error Handling

Custom error classes (`src/types.ts`): `FileSystemError`, `ConfigError`, `TemplateError`, `HarnessError`. Template-processing errors usually mean malformed frontmatter or missing variables — check syntax and variable names. Schema-version mismatches: read the error — it names the direction and the fix (see Schema Version Contract).

---

## Cursor Cloud specific instructions

When developing in a Cursor Cloud Agent VM, read [`.cursor/cloud-instructions.md`](.cursor/cloud-instructions.md) for environment setup and run caveats (build-before-run, the `serve` workspace requirement, e2e browser install). Load it on demand — it is not needed for routine local work.

<!-- >>> kenkeep:kk-index >>> -->
You are required to load [.ai/kenkeep/ENTRY.md](.ai/kenkeep/ENTRY.md), the small curated entry catalog for this repo. Enter there and descend using progressive disclosure principles.


<!-- <<< kenkeep:kk-index <<< -->
