---
schema_version: 1
summaries:
  capture: >-
    the documentation-visual capture harness — its committed fixture workspace
    and Playwright SPA-driving technique
  cli: >-
    CLI command surface and command-routing boundaries; read when changing
    src/cli.ts or documenting available commands
  code-review: >-
    the report-only code review gate — reviewer discovery and dispatch, the
    stdout delivery channel, XSD certification, and cumulative-diff scoping
  conventions: >-
    documentation and terminology conventions — current-state-only docs and the
    reserved meaning of phase
  dev: >-
    the local development loop — dev:serve hot reload, the three concurrent
    processes, and rebuilding the SPA for serve
  devcontainer: >-
    devcontainer environment and t3 agent sandbox setup — Docker networking,
    port configuration, and t3 desktop connection; read when configuring or
    troubleshooting the devcontainer
  docs: >-
    documentation site configuration and docs-publishing conventions; read when
    changing docs/ or GitHub Pages settings
  git: >-
    Git workflow constraints — commit-message hooks, the pre-commit test gate,
    attribution rules, and gitignored workspace state
  profiles: >-
    strikethroo setup profiles — the importable package contract, its validation
    surface, and the init-time overlay; not execution_routing.profiles; read
    before authoring, importing, or exporting a profile, or before changing what
    init accepts from one
  release: >-
    releasing and distribution — semantic-release, the npm-tarball vs
    GitHub-git-tree channels, and the root skills/ release mirror with its
    release-only sync
  serve: >-
    the read-only serve backend — HTTP/JSON API routes, the workspace data model
    and derivation, and the archive and self-review operations
  skills: >-
    the harness-agnostic Agent Skills system — intent-based loading, the
    skill-scripts root utility, and cross-harness abstraction
  skills/prompts: >-
    building SKILL.md from src/skill-prompts/ Handlebars sources — shared
    partials, the assembler, and the source-of-truth convention
  testing: >-
    the test strategy — the committed fixture workspace, Vitest node-env limits,
    and Playwright e2e selectors and flakiness
  tooling: >-
    lint, format, and type-check tooling — the ESLint flat config, Prettier
    exclusions, and gaps in the lint gate
  web: >-
    the React + Vite + Tailwind SPA — data layer, screens, routing, and the
    branding, editor, rendering, styling, and ui subareas
  web/branding: >-
    the strikethroo brand favicon and the font-glyph-extraction technique behind
    it
  web/editor: >-
    the code-split CodeMirror 6 markdown editor in the Customize detail route
    and its lazy-loading constraints
  web/rendering: >-
    SPA markdown and mermaid rendering — the shared sanitization boundary,
    prose-component reuse, and render-error handling
  web/styling: >-
    SPA styling — Tailwind v4 utilities, the @theme token layer, dark mode, and
    the vendored dalia CSS foundation
  web/ui: SPA interactive UI components and read-only affordance conventions
---
# kenkeep Folder Summaries

- `capture`: the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique
- `code-review`: the report-only code review gate — reviewer discovery and dispatch, the stdout delivery channel, XSD certification, and cumulative-diff scoping
- `cli`: CLI command surface and command-routing boundaries; read when changing src/cli.ts or documenting available commands
- `conventions`: documentation and terminology conventions — current-state-only docs and the reserved meaning of phase
- `dev`: the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve
- `devcontainer`: devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer
- `docs`: documentation site configuration and docs-publishing conventions; read when changing docs/ or GitHub Pages settings
- `git`: Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state
- `profiles`: strikethroo setup profiles — the importable package contract, its validation surface, and the init-time overlay; not execution_routing.profiles; read before authoring, importing, or exporting a profile, or before changing what init accepts from one
- `release`: releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and the root skills/ release mirror with its release-only sync
- `serve`: the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations
- `skills`: the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction
- `skills/prompts`: building SKILL.md from src/skill-prompts/ Handlebars sources — shared partials, the assembler, and the source-of-truth convention
- `testing`: the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness
- `tooling`: lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate
- `web`: the React + Vite + Tailwind SPA — data layer, screens, routing, and the branding, editor, rendering, styling, and ui subareas
- `web/branding`: the strikethroo brand favicon and the font-glyph-extraction technique behind it
- `web/editor`: the code-split CodeMirror 6 markdown editor in the Customize detail route and its lazy-loading constraints
- `web/rendering`: SPA markdown and mermaid rendering — the shared sanitization boundary, prose-component reuse, and render-error handling
- `web/styling`: SPA styling — Tailwind v4 utilities, the @theme token layer, dark mode, and the vendored dalia CSS foundation
- `web/ui`: SPA interactive UI components and read-only affordance conventions
