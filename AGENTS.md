# AGENTS.md

This file provides comprehensive guidance to AI assistants when working with this repository. It serves as the primary context source for AI-assisted development.

## Quick Start Guide

### Essential Commands
```bash
# Build and run
npm run build && npm start init --harnesses claude

# Serve the read-only workspace viewer (SPA + JSON API + SSE)
npm run build && node dist/cli.js serve        # or: npx strikethroo serve

# Development workflow
npm run dev           # Watch mode compilation
npm test              # Full test gate: unit (Vitest) then e2e (@playwright/test)
npm run lint:fix      # Auto-fix code style issues
```

### Project Initialization
```bash
# Bootstrap the .ai/strikethroo/ workspace (Claude agents copied too)
npx . init --harnesses claude --destination-directory /path/to/project

# Update existing (customizations auto-protected)
npx . init --harnesses claude --destination-directory /path/to/project

# Force overwrite all
npx . init --harnesses claude --destination-directory /path/to/project --force
```

The workflow itself is delivered as Agent Skills, not slash commands. Install them once with `npx skills add e0ipso/strikethroo`; users then invoke the workflow by intent and the matching skill auto-loads.

### File Conflict Detection

The init command uses hash-based tracking to protect user customizations:
- Creates `.ai/strikethroo/.init-metadata.json` with SHA-256 file hashes
- Compares current vs original hashes to detect user modifications
- Use `--force` flag to bypass prompts in automation

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

### Purpose and Scope

This CLI tool initializes AI-assisted development environments with hierarchical task management systems. It creates structured workflows that transform complex programming requests into manageable, validated implementations through progressive refinement and atomic task decomposition.

### Core Value Proposition

- **Cognitive Load Management**: Prevents AI context overload through staged processing
- **Scope Control**: Enforces YAGNI principles and prevents feature creep
- **Quality Assurance**: Ensures working code through integrity-focused testing
- **Harness-Agnostic Delivery**: Skills work uniformly across any harness that supports the Agent Skills format

---

## Strikethroo Plan and Task Management System

### Three-Step Workflow

The system implements a specialized workflow optimized for AI cognitive constraints. Each step is delivered as an Agent Skill that the assistant auto-loads when the user's request matches its description.

#### Step 1: Strategic Planning (`st-create-plan` skill)
- **Focus**: Context gathering and requirement clarification
- **Output**: Comprehensive plan with mandatory clarification gates
- **Prevents**: Assumption-based planning and scope ambiguity

#### Step 2: Task Decomposition (`st-generate-tasks` skill)
- **Focus**: Breaking complexity into atomic units
- **Output**: Dependency-mapped tasks with skill assignments
- **Enforces**: 20-30% task reduction and 1-2 skill maximum per task

#### Step 3: Execution (`st-execute-blueprint` skill)
- **Focus**: Current task implementation with minimal context
- **Output**: Working functionality with quality gates
- **Implements**: Dependency-aware parallelism and quality control

#### Plan Review Loop (`st-refine-plan` skill)
- **Focus**: Run a feedback cycle between assistants by interrogating an existing plan
- **Output**: Updated plan document with clarified requirements, refreshed diagrams, and documented outstanding questions
- **Purpose**: Bridges plan creation and task generation when a second assistant should "red team" the plan, ask questions, and apply the refinements

The end-to-end `st-full-workflow` skill chains all three steps for hands-off runs. The `st-execute-task` skill handles single-task execution.

### Key Design Principles

#### Atomic Task Decomposition
- **Maximum 2 skills per task**: Prevents over-complexity
- **Automatic skill inference**: Context-based task categorization  
- **Dependency mapping**: Clear prerequisite relationships
- **Subdivision triggers**: 3+ skills indicate need for task breakdown

#### Scope Control (YAGNI Enforcement)
- **Anti-pattern enumeration**: Identifies common scope expansion behaviors
- **Question-based validation**: "Is this explicitly mentioned?" decision framework
- **Quantified minimization**: 20-30% reduction targets from comprehensive lists
- **Requirement traceability**: Every task links to explicit user requirements

#### Test Philosophy: "Write a Few Tests, Mostly Integration"
- **Selective coverage**: Focus on meaningful tests, not complete coverage
- **Integration-heavy**: Real filesystem operations over mocking
- **Business logic focus**: Custom logic, critical workflows, edge cases
- **Framework avoidance**: Don't test third-party library features

---

## Skills Layer

The repository ships Agent Skills under `templates/harness/skills/<name>/` at the repo root. There is no top-level `skills/` directory; compiled `.cjs` bundles live under each per-skill `scripts/` directory, and `SKILL.md` files are assembled from source templates at build time. Skills are harness-agnostic — a single `SKILL.md` works for every harness that supports the Agent Skills format. Skill directories are flat (no nested skills).

The shipping skills are:

- `st-create-plan` (`templates/harness/skills/st-create-plan/`) — strategic plan creation with mandatory clarification gates.
- `st-generate-tasks` (`templates/harness/skills/st-generate-tasks/`) — task decomposition with dependency mapping and skill assignments.
- `st-execute-blueprint` (`templates/harness/skills/st-execute-blueprint/`) — execution orchestration across all tasks in a plan.
- `st-refine-plan` (`templates/harness/skills/st-refine-plan/`) — plan refinement loop with interactive and autonomous clarification modes.
- `st-execute-task` (`templates/harness/skills/st-execute-task/`) — single-task execution.
- `st-full-workflow` (`templates/harness/skills/st-full-workflow/`) — end-to-end orchestration chaining the three steps (plan creation, task generation, blueprint execution) with context passing, progress indicators, and auto-generation fallback.

### TypeScript source of truth

Executable logic each skill needs at runtime is authored once in TypeScript under `src/skill-scripts/`. Shared helpers (frontmatter parsing, plan/archive scanning, root discovery) live in `src/skill-scripts/shared/` so future skills can reuse them. The subtree type-checks via `tsconfig.skill-scripts.json` and lints with the rest of `src/`, but its output is produced by the bundler, not by `tsc`. The main `tsconfig.json` excludes `src/skill-scripts/**` from emit so `dist/` stays the CLI's domain.

### Serve feature (`src/serve/`)

`src/serve/` hosts the `serve` feature. Its first building block is `workspace-model.ts`: the pure, synchronous, side-effect-free data layer that scans a project's `.ai/strikethroo/` tree and returns the stable JSON model (plan summaries and details, derived lifecycle state, tasks, inferred phases, mermaid blocks, and the customizable `config/` hooks and templates) that the runtime server and the UI screens consume. It performs reads only — no file-watching, network, or writes — and reuses the `src/skill-scripts/shared/` discovery helpers (`findStrikethrooRoot`, `getAllPlans`) rather than re-walking directories. This directory is part of the CLI's `tsc` domain and ships in `dist/`.

The CLI now exposes a `serve` command in addition to `init`, registered thinly in `src/cli.ts` (flags: `--port <n>` default `4317`, `--no-open`, `--workspace <path>`). The runtime server lives entirely under `src/serve/`: `server.ts` (static SPA host with traversal protection and `index.html` fallback, the read-only JSON API over the workspace model, and platform-aware browser auto-open), `events.ts` + `watcher.ts` (the `GET /api/events` SSE change stream backed by a debounced recursive `fs.watch`), and `root.ts` (a self-contained workspace resolver that, unlike `workspace-model.ts`, deliberately does **not** import across the `src/skill-scripts/**` build boundary). All of it uses Node built-ins only (`http`, `fs`, `path`, `url`, `child_process`) — no runtime frontend dependency — and is compiled by the main `tsc` pipeline into `dist/`, so no new build plumbing is required for the server. Full build/distribution wiring for the shipped SPA assets is handled by a later plan.

The server performs exactly **two** sanctioned writes to the workspace; every other route is read-only. The first is the guarded **archive action** (`archive.ts`, `POST /api/plans/:id/archive`): given a plan that exists, currently lives under `plans/`, and is in the derived `done` state, it performs a single atomic directory rename into `archive/` and returns the refreshed model. It never deletes or edits files, refuses to overwrite an existing destination, and rejects any non-`done` plan with a typed failure. The UI surfaces it as a confirmation-gated **Archive** control on done plans only. This is the manual escape hatch for done-but-unarchived plans and does **not** replace `st-execute-blueprint`'s automatic archival on successful completion.

The second sanctioned mutation is the guarded **config write** (`config-write.ts`, `writeConfigFile`, surfaced as `PUT /api/config/:kind/:id` with a JSON `{ content }` body — `MAX_BODY_BYTES` is raised to 1 MiB to carry whole markdown files): it overwrites a single existing hook or template file in place and returns the refreshed config slice (`200`; `400` invalid kind/id, `404` no such file, `500` fs error). It enforces a strict allowlist — overwrite-only (the target file must already exist), `kind` whitelisted to `hooks` or `templates`, and `id` resolved to a single flat `config/<kind>/<id>.md` child with path-traversal/separator/`..` rejection — and never creates, deletes, or renames. Expected guard failures return a typed result rather than throwing. To support the editor, the workspace model's `getConfig` now surfaces each file's workspace-relative `relPath` (e.g. `config/hooks/PRE_PLAN.md`) on `ConfigFile`. (The server also exposes `POST /api/self-review`, which launches an external reviewer binary but writes nothing to the workspace; the archive rename and the config overwrite are the only two routes that mutate workspace files.)

### Web SPA (`src/web/`)

`src/web/` is the React + Vite + Tailwind v4 SPA that `serve` hosts (built with `npm run build:web` via `vite.config.mts`, separate from the CLI's `tsc`/`dist/` domain and from `dist-web/`). It consumes the read-only serve API through the fetch-only data layer in `src/web/data/api.ts` (`usePlans`, `usePlanDetail`, `useConfig` over a `loading | error | data` resource state); screens never fetch directly or carry mock data. The hand-rolled History-API router (`src/web/router.tsx`), the persistent `Sidebar` + `Chrome` shell (`src/web/App.tsx`, `src/web/components/`), and the presentational primitives (`StatusPill`, `Tickbox`, `Button`, `Chip`, `Modal` in `components/primitives.tsx`) are shared by every screen. The shared `Chrome` (`src/web/components/Chrome.tsx`) accepts a breadcrumb contract of `string | { label: string; href: string }`: a `{ label, href }` crumb navigates through the router on click, while bare-string crumbs and the current/last crumb stay inert text. Visual styling is the vendored Dalia class system under `src/web/vendor/styles/` (one `index.css` that `@import`s the layered files, including the per-screen `app-shell.css` / `plans.css` / `detail.css` vendored verbatim from `scratch/ui/designs/app.css`); React components are thin wrappers that emit those canonical class names.

**Screens and view conventions.** The Plans home (`src/web/plans/PlansRoute.tsx`) defaults to the **Board** view, with the in-place switcher tabs in the order **Board, Cards**. The Archive table uses the client-side sort mechanism in `src/web/data/sort.ts` (`SortDir`, `SortState`, `makeComparator`, `sortRows`, and the `useTableSort` hook implementing the header-click toggle: a new column defaults to `desc`, re-clicking the active column flips direction); callers supply their own column accessor map and the module bakes in no screen-specific column knowledge. The Archive screen (`src/web/archive/ArchiveRoute.tsx` plus the pure helpers in `src/web/archive/helpers.tsx`) wires a completed-date sort, a `from`/`to` date-range filter (`filterByDateRange`), and a By-month grouping (`groupByMonth`); the displayed list is composed in the order search → date-range → sort → group, and both the result count and `archiveStats` reflect that filtered set (the **All** tab shows the flat table, **By month** regroups under completion-month headings). The Plan Detail route (`src/web/plans/detail/PlanDetailRoute.tsx`) exposes the tabs **Plan, Graph, Tasks** — the former Execute tab is renamed **Tasks** (rendering the execution blueprint via `ExecuteTab`), and the snapshot Tasks board (the removed `PlanDetailBoard.tsx`) no longer exists. The Plan tab's Reader (`PlanDetailReader.tsx`) uses the `.detail` `1fr 420px` grid (`src/web/vendor/styles/detail.css`): wide center prose first with the execution-blueprint rail on the **right**, reflowing below the prose at max-width 900px. Read-only blueprint task rows are de-checkboxed: the Plan-tab `BlueprintRail.tsx` and the Tasks-tab `ExecOutlineView.tsx` (`src/web/plans/exec/`) carry no `Tickbox`, representing a done task as **strikethrough** text (the Outline rows keep their `StatusPill`). The Graph view renders mermaid with a smaller `fontSize` theme variable (`src/web/render/mermaid.ts`) and non-uppercased cluster labels (`board-graph.css`). The Task Detail route (`/plans/:id/tasks/:taskId`, the router's `taskDetail` section) renders `TaskDetailRoute` (`src/web/plans/detail/TaskDetailRoute.tsx`): a read-only screen that reuses the already-fetched `usePlanDetail(id)` payload (no new endpoint or fetch), locates the task by numeric id, and renders its body through the shared `Section` renderer (exported from `ReaderProse.tsx`, the same component the Plan tab uses) — still over the single `renderMarkdown` boundary — so `##` headings, the Success-Criteria `.crit` treatment, and inline lazy/themed mermaid render identically to plan sections, plus a metadata header (status `StatusPill`, `group`/`skills` chips, and dependency ids that link to sibling task detail pages). It carries a local-state `Chrome` tab strip whose "Implementation Notes" tab slices the `## Implementation Notes` section out of the main body (via a `splitResultsSections`-style helper), mirroring the Plan Detail "Results" tab. Loading, error, plan-not-found, task-not-found, and empty-body states each render a designed surface. The task rows in `BlueprintRail` (Plan tab) and `ExecOutlineView` + `ExecSwimlanesView` (Tasks tab) are now clickable and navigate to that route (still de-checkboxed and read-only; a task lacking an `id` stays inert, via the shared `src/web/plans/taskNav.ts` helper). The client `Task` type (`src/web/data/api.ts`) includes `body`/`file` and now also carries `sections` (`MarkdownSection[]`), serialized server-side by reusing `sectionBody` in `scanTasks` (`src/serve/derivation.ts`) alongside the retained raw `body`.

**Single markdown/sanitization boundary.** All markdown rendering and HTML sanitization in the SPA go through `src/web/render/markdown.ts` (`renderMarkdown(source) -> sanitized HTML`, built on `marked` with raw-HTML escaping plus a DOMPurify pass that forbids `<script>`/`<style>` and `on*` handlers). No screen may parse markdown or sanitize HTML on its own — import `renderMarkdown` so the rendering rules and the sanitization policy live in exactly one place. Mermaid is the sibling `src/web/render/mermaid.ts` path: it reaches the mermaid library exclusively through a lazy dynamic `import()`, so it is code-split out of any consumer (the Plan Detail Reader ships no mermaid) and is activated only by the Graph view. `marked`, `dompurify`, and `mermaid` are SPA-only **devDependencies** (alongside `react`/`vite`), not CLI runtime deps.

**Customize section (`src/web/customize/`).** The `/customize` route (`CustomizeRoute.tsx`) calls `useConfig()` once, owns the `'hooks' | 'templates'` tab state (live count badges via `CustomizeChrome`), and renders the **same** shared responsive card grid for both tabs: `ConfigCardGrid.tsx` lays the active tab's `ConfigFile[]` into a CSS-grid (3 → 2 → 1 columns) of `cz__card` buttons, each whose whole surface navigates to `/customize/<kind>/<id>`. A card shows an eyebrow (`.ai/strikethroo/<relPath>`), the title (file `id`), and an optional description. The legacy `HooksView.tsx`/`TemplatesView.tsx` (inline content reveal, intelligence/control grouping, frontmatter/section breakdown, inert action buttons) are **deleted**; `CustomizeChrome` no longer carries inert actions. Descriptions come from the build-time **description registry** `src/web/customize/descriptions.yaml`, imported as data via the `@modyfi/vite-plugin-yaml` plugin and merged onto each file by `id` once in `useConfig` (`descriptionFor`); no component re-implements that lookup. The deep-linkable detail route (`/customize/:kind/:id`, the router's `customizeDetail` section) renders `CustomizeDetailRoute.tsx`: it reuses the already-fetched `useConfig()` payload (no per-file GET), locates the file, and mounts the **CodeMirror 6** markdown editor `MarkdownEditor.tsx` seeded with the file content; a **Save** button persists edits through `saveConfigFile` (`PUT /api/config/:kind/:id`), with inline saving/saved/error feedback and unknown-kind/not-found designed surfaces. `MarkdownEditor` is **lazy / code-split** — `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, and `@codemirror/theme-one-dark` are reached only through a single dynamic `import()` inside a `React.lazy` factory, so the listing bundle never pulls CodeMirror — and **theme-aware**, applying `oneDark` when the resolved scheme is `dark` (mirroring the mermaid theming contract). The editor wires `markdown({ codeLanguages: languages })` from `@codemirror/language-data` so fenced code blocks tagged with a language (```ts, ```bash, ```json, …) get nested-language highlighting; each grammar is itself fetched lazily by the registry's own loaders, so it does not bloat the editor chunk. The editor is a **distinct boundary from `renderMarkdown`/DOMPurify**: it shows raw, EDITABLE markdown source with syntax highlighting and deliberately does NOT route content through the sanitization path (and renders no preview). CodeMirror (`@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, `@codemirror/theme-one-dark`) and the YAML plugin (`@modyfi/vite-plugin-yaml`) are SPA-only / build-time **devDependencies** and must NEVER move to runtime `dependencies`.

**Theme (dark mode).** Theming is **class-based, not media-query-based**: the vendored Dalia styles already ship a complete set of `.dark`-scoped token overrides, so the theme layer only *activates* them by toggling a single `.dark` class on `document.documentElement` (which reaches `<body>` and the in-tree, non-portaled `Modal`). The single source of truth is the framework-agnostic controller `src/web/theme/theme.ts`: the tri-state `Theme` (`light | dark | system`, default `system`), the `localStorage` key `strikethroo-theme` (`THEME_STORAGE_KEY`), pure `parseTheme`/`resolveTheme` helpers, and guarded `localStorage`/`matchMedia`/`document` wrappers that never throw when a global is absent. `ThemeProvider` (`src/web/theme/ThemeProvider.tsx`, the outermost provider in `App.tsx`, exposing `useTheme()`) holds the preference, applies the resolved theme on mount and on change, and subscribes to `prefers-color-scheme` — re-applying **only while the preference is `system`** so a manual Light/Dark choice ignores OS changes. `useTheme()` also exposes the concrete `resolved` (`light | dark`) scheme: mermaid is the one renderer that cannot be themed by class alone (it bakes colors into the SVG at render time, so the CSS-var label colors would otherwise sit on light-mode fills in dark mode), so the Graph and Reader mermaid consumers pass `resolved` to `renderMermaid(source, theme)` and re-render on theme change, which (re)initializes mermaid with a theme-matched palette (`THEME_COLORS` in `src/web/render/mermaid.ts`; light passes no overrides to preserve the `base`-theme look). The tri-state `ThemeToggle` lives in the Sidebar footer (`src/web/components/Sidebar.tsx`). To avoid a flash of light on load, a small inline pre-paint guard in `src/web/index.html` mirrors the same storage key and resolution rule and sets the class before first paint (it deliberately duplicates that tiny logic because it runs before any module loads, and as static shell markup it is outside the `renderMarkdown`/DOMPurify boundary). No runtime dependency is added — `matchMedia` and `localStorage` are browser built-ins.

**No frontend runtime dependencies.** Because `serve` ships only the prebuilt static `dist-web/` bundle, the published package's runtime `dependencies` carry no frontend libraries. Vite, React, react-dom, Tailwind, `@base-ui-components/react`, `lucide-react`, `mermaid`, `marked`, `dompurify`, `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`, `@codemirror/theme-one-dark`, and `@modyfi/vite-plugin-yaml` all stay in `devDependencies` and must never move to `dependencies` — they are build-time only. The runtime server (`src/serve/`) uses Node built-ins exclusively.

### Capture harness (`src/capture/`)

The documentation visuals under `docs/assets/` (the stills, interaction videos, and `readme-preview.png` embedded in the README and the `docs/web-app.md` page) are produced by the Playwright capture harness entry point `src/capture/capture-web.ts`, run via `npm run capture:web`. It serves the repo's **own** `.ai/strikethroo/` workspace through `serve`, drives the SPA with a real Chromium, and writes every asset into `docs/assets/`. It is deliberately **not** part of `npm test` (it is a manual, on-demand regeneration tool, not a gate). To regenerate the assets, first `npm run build:web` (the harness drives the prebuilt `dist-web/`) and have Chromium installed (`npx playwright install --with-deps chromium`), then run `npm run capture:web`.

### Prompt source of truth

Each skill's `SKILL.md` prompt is assembled at build time from source templates in `src/skill-prompts/`. Shared procedural blocks (root discovery, plan resolution, phase execution loop, test philosophy, task minimization, etc.) live in `src/skill-prompts/sections/` and are referenced via `{{include sections/<name>.md}}` directives. Per-skill differences are handled with `{{variable}}` substitution from the source template's YAML frontmatter `vars` block. See `src/skill-prompts/README.md` for editing and authoring details.

### Build pipeline

`npm run build` runs the TypeScript compile, then `npm run build:web`, then `npm run build:skills`, then `npm run build:skill-prompts` (`tsc && npm run build:web && npm run build:skills && npm run build:skill-prompts`):

1. Compiles the CLI's `tsc` domain (including `src/serve/`) into `dist/`.
2. Runs `npm run build:web` (`vite build`), which compiles the `src/web/` SPA into `dist-web/` at the repo root — the static assets `serve` hosts at runtime. This is a Vite build, separate from the CLI's `tsc`/`dist/` domain.
3. Invokes `scripts/build-skills.cjs`, an `esbuild`-driven script that bundles each registered entrypoint into a self-contained `.cjs` file emitted directly into `templates/harness/skills/<skill>/scripts/`. There is no copy pass — source and output share the same per-skill tree.
4. Invokes `scripts/build-skill-prompts.cjs`, which resolves `{{include}}` directives and `{{variable}}` substitutions in source templates from `src/skill-prompts/`, writing assembled `SKILL.md` files to `templates/harness/skills/<skill>/SKILL.md`. Post-build validation fails on unresolved directives, missing frontmatter fields, or absent `## Operating Procedure` headings.

The entrypoint → skill mapping is the `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs`, which currently registers six shipping skills. To add a future skill: drop a TypeScript entrypoint under `src/skill-scripts/`, add an entry to `SKILL_ENTRYPOINTS`, add the skill's path to `.claude-plugin/plugin.json`, create a source template in `src/skill-prompts/`, and `npm run build` produces both the bundled `.cjs` and assembled `SKILL.md` alongside the skill. No other plumbing changes are needed.

There are three categories of generated-but-shipped artifacts, all git-ignored on `main` and force-added into the release commit by `@semantic-release/git` (which uses `git add --force`): (1) the bundled `.cjs` files under `templates/harness/skills/*/scripts/`, (2) the assembled `SKILL.md` files under `templates/harness/skills/*/`, and (3) the prebuilt SPA under `dist-web/`. The skill bundles and prompts ship in the published npm package via the `files: ["templates/"]` entry in `package.json` (which covers all skill content); the SPA ships via the `files: ["dist-web/"]` entry (verify all three with `npm pack --dry-run`).

### Distribution

Skills are distributed via [vercel-labs/skills](https://github.com/vercel-labs/skills), a generic Anthropic-adjacent installer. It discovers skills in this repo by reading `.claude-plugin/plugin.json` at the repo root, which declares each skill's path under `templates/harness/skills/<name>/`. The manifest is a JSON file with a `skills:` array of `./templates/harness/skills/<name>` entries (the leading `./` is required) and an optional `name` grouping label. Users run `npx skills add e0ipso/strikethroo` (or `…@<tag>` to pin) and the installer reads the tagged release ref. `npx strikethroo init` does **not** copy skills — it bootstraps the `.ai/strikethroo/` workspace only. The two channels are independently re-runnable; the only coupling point is the schema-version contract below.

Note the semantic distinction between the two sibling directories under `templates/harness/`: `templates/harness/skills/` is build/install-time content read by the installer at `npx skills add` time, while `templates/harness/agents/` is per-project init-time content copied into `.claude/agents/` by `npx . init`. The CLI's `init` does not read `templates/harness/skills/`.

### Schema Version Contract

`.ai/strikethroo/.init-metadata.json` carries a `workspaceSchemaVersion` integer (initial value `1`). It is distinct from the CLI's `version` string and changes only when the workspace shape (hook names, required templates, directory structure) changes incompatibly. The single source of truth is `CURRENT_WORKSPACE_SCHEMA_VERSION` in `src/metadata.ts`.

Skills bake an `EXPECTED_WORKSPACE_SCHEMA_VERSION` literal into each shipped `.cjs` bundle via esbuild's `define`. At runtime, the resolver in `src/skill-scripts/shared/root.ts` compares the workspace value against the baked value:

- **Workspace older than skill** (`<actual>` < `<expected>`):
  `Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx strikethroo init\` with the latest CLI to update.`
- **Workspace newer than skill** (`<actual>` > `<expected>`):
  `This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/strikethroo\` to update skills.`

Absent `workspaceSchemaVersion` values in older metadata files are backfilled to `1` on read by both the CLI loader and the skill-side check, so already-deployed workspaces are not broken by the field's introduction. Bump the constant only when the workspace shape genuinely changes incompatibly; the documented upgrade path is to re-run `init` (no dedicated `migrate` subcommand exists).

A post-build smoke assertion in `scripts/build-skills.cjs` fails the build if the literal string `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives substitution into any bundled `.cjs` file — catching mistakes where the identifier reference would silently fall back to the runtime default.

### GitHub Releases

Releases are handled by `semantic-release` via `.github/workflows/release.yml`, triggered on push to `main`. The workflow runs `npm ci && npm run build && npx playwright install --with-deps chromium && npm test` (the Playwright browser install is required because `npm test`'s e2e half runs on `@playwright/test` against a real Chromium), then `npx semantic-release` which: analyzes commits, bumps the version, publishes to npm, and creates a GitHub release with a git tag. The `@semantic-release/git` plugin's `assets` glob includes `templates/harness/skills/*/scripts/*.cjs`, `templates/harness/skills/*/SKILL.md`, and `dist-web/**`, so the otherwise git-ignored skill bundles, assembled prompts, and prebuilt SPA are force-added into the release commit. The tagged ref is self-contained so `npx skills add e0ipso/strikethroo@<tag>` resolves a fully installable input.

Verify the invariant:

```bash
git ls-tree -r v<tag> -- 'templates/harness/skills/*/scripts/*.cjs'   # expect: bundles listed
git ls-tree -r v<tag> -- 'templates/harness/skills/*/SKILL.md'        # expect: prompts listed
git ls-tree -r v<tag> -- 'dist-web/*'                                 # expect: SPA assets listed
```

Release commits are labeled `chore(release):` in the subject and carry `[skip ci]` to avoid re-triggering the workflow.

---

## Directory Structure and Organization

### Core Directory Structure
```
project/
├── .ai/strikethroo/               # Shared workspace (harness-agnostic)
│   ├── plans/                     # Active plans with tasks/
│   │   └── 28--plan-name/
│   │       ├── plan-28--plan-name.md
│   │       └── tasks/
│   │           ├── 01--task-one.md
│   │           └── 02--task-two.md
│   ├── archive/                   # Completed plans
│   ├── config/
│   │   ├── STRIKETHROO.md         # Project context
│   │   ├── hooks/                 # Lifecycle hooks (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_TASK_GENERATION_ALL, POST_EXECUTION, POST_ERROR_DETECTION)
│   │   └── templates/             # Customizable (PLAN_TEMPLATE.md, TASK_TEMPLATE.md)
└── .claude/agents/                # Claude-only sub-agents copied by `init`
```

The workflow itself is delivered through Agent Skills (installed via `npx skills add e0ipso/strikethroo`). The CLI's `init` does not emit per-harness command or prompt directories.

### Archive System and Lifecycle Management

#### Purpose and Benefits
- **Organization**: Clean active workspace with historical preservation
- **Reference**: Past implementations available for pattern reuse
- **ID Management**: Prevents conflicts through continuous numbering
- **Compliance**: Maintains audit trail of project evolution

#### Archival Process
```bash
# Manual archival after completion
mv .ai/strikethroo/plans/25--completed-plan .ai/strikethroo/archive/
```

---

## Development Workflow

### Standard Development Commands

#### Build and Development
```bash
npm run build        # TypeScript compilation to dist/
npm run dev          # Watch mode with automatic recompilation  
npm run clean        # Remove dist/ directory
npm start            # Execute compiled CLI (requires build first)
```

#### Testing and Quality Assurance
```bash
npm test             # Single CI gate: runs test:unit then test:e2e
npm run test:unit    # vitest run --coverage — 16 unit/integration suites (Vitest, node env, v8 coverage gate)
npm run test:e2e     # playwright test — 8 e2e suites (@playwright/test, real Chromium vs prebuilt dist-web/)
npm run test:watch   # vitest — unit/integration tests in watch mode for development
npm run lint         # ESLint validation (excludes test files)
npm run lint:fix     # Automated lint fixes
npm run format       # Prettier code formatting
```

`npm test` chains `npm run test:unit && npm run test:e2e`, so unit failures short-circuit before e2e runs. `test:unit` runs the suites on Vitest in the `node` environment and enforces the v8 coverage thresholds (branches 19 / functions 12 / lines 24 / statements 24, text + json-summary reporters into `coverage/`). `test:e2e` runs the e2e suites on `@playwright/test`, which **requires Playwright browsers installed** — install them with `npx playwright install --with-deps chromium` before running e2e or `npm test` locally; CI runs that install step before `npm test`. Config lives in `vitest.config.ts` and `playwright.config.ts` at the repo root (there is no Jest, `ts-jest`, or `jest.config.js`).

#### Security and Maintenance
```bash
npm run security:audit        # Standard security audit
npm run security:audit-json   # JSON formatted audit output  
npm run security:fix          # Automated security fixes
npm run security:fix-force    # Force fixes for critical issues
npm run prepublishOnly        # Pre-publish validation (auto-runs)
```

### Testing Philosophy

#### Test File Organization

Unit/integration suites run on **Vitest** (`npm run test:unit`):
- `src/__tests__/utils.test.ts`: Business logic validation
- `src/__tests__/cli.integration.test.ts`: End-to-end workflows
- `src/__tests__/get-next-plan-id.test.ts`: ID generation validation

Browser-level e2e suites run on **@playwright/test** (`npm run test:e2e`) against the prebuilt `dist-web/` SPA with a real Chromium.

#### Testing Guidelines
**DO Test**:
- Data transformation and validation logic
- Complex business rules and algorithms
- Error scenarios and edge cases
- Integration points and workflows
- Critical path functionality

**DON'T Test**:
- Simple getters/setters
- Third-party library features
- Framework-provided functionality
- Obvious utility functions
- Trivial CRUD operations

### Adding New Harness Support

Skills are harness-agnostic — any harness that supports the Agent Skills format consumes the same `SKILL.md` content. No code or template changes are required to support a new harness. Users install skills via `npx skills add e0ipso/strikethroo`.

## Template Customization

### Plan Template Structure

**YAML Frontmatter**:
```yaml
id: [planId]
summary: "[userPrompt]"
created: "YYYY-MM-DD"
```

**Core Sections**:
- Original Work Order
- Plan Clarifications  
- Executive Summary
- Context and Background
- Technical Implementation Approach
- Risk Considerations
- Success Criteria
- Resource Requirements

### Task Template Structure

**YAML Frontmatter**:
```yaml
id: [task-number]
group: "[logical-grouping]"
dependencies: [list-of-task-ids]
status: "pending"
created: "YYYY-MM-DD"
skills: ["skill-1", "skill-2"]
```

**Core Sections**:
- Objective
- Skills Required
- Acceptance Criteria
- Technical Requirements
- Input Dependencies
- Output Artifacts
- Implementation Notes

### Customization Guidelines

Edit base templates at:
- `/workspace/templates/strikethroo/config/templates/PLAN_TEMPLATE.md`
- `/workspace/templates/strikethroo/config/templates/TASK_TEMPLATE.md`

**Best Practices**:
- Maintain YAML frontmatter format
- Preserve core metadata fields
- Use lowercase for bash variables (`task_count`, `plan_id`)
- Template placeholders `$ARGUMENTS` and `$1` are exceptions (not bash variables)

**Validate changes**:
```bash
npm run build
node dist/cli.js init --harnesses claude --destination-directory /tmp/test
```

---

## Error Handling and Troubleshooting

### Common Issues and Solutions

#### Template Processing Errors
**Symptoms**: Malformed frontmatter, missing variables
**Debugging**: Check template syntax, validate frontmatter format, verify variable names
**Solutions**: Use standard frontmatter, test variable substitution

#### Skill Schema-Version Mismatches
**Symptoms**: Skill bundles refuse to run with a workspace-vs-skill version error
**Debugging**: Read the error message — it names the direction of the mismatch
**Solutions**: Re-run `npx strikethroo init` (workspace behind skill) or `npx skills add e0ipso/strikethroo` (skill behind workspace)

### Error Handling Architecture

#### Custom Error Classes
```typescript
// From src/types.ts
FileSystemError    // File operation failures
ConfigError        // Configuration validation issues  
TemplateError      // Template processing problems
HarnessError       // Harness validation failures
```

#### Error Recovery Strategies
- **Graceful Degradation**: Continue operation when possible
- **Detailed Logging**: Provide context for debugging
- **User-Friendly Messages**: Clear guidance for resolution
- **Fail-Fast**: Stop early for critical errors

---

<!-- >>> @e0ipso/ai-knowledge-base:kb-index >>> -->
Curated project knowledge lives in [.ai/knowledge-base/INDEX.md](.ai/knowledge-base/INDEX.md). Consult it before designing a non-trivial change.
<!-- <<< @e0ipso/ai-knowledge-base:kb-index <<< -->
