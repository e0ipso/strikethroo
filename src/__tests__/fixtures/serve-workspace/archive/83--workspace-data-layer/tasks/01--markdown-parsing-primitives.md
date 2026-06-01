---
id: 1
group: "parsing-layer"
dependencies: []
status: "completed"
created: 2026-05-28
skills:
  - typescript
---
# Markdown frontmatter, section, and mermaid parsing primitives

## Objective
Create the pure, dependency-light parsing primitives that turn a single
markdown file's raw content into structured data: a full frontmatter
key/value reader, a named-section splitter for the markdown body, and a
mermaid fenced-block extractor that identifies the block(s) under the
"Architectural Approach" section. These are the reusable building blocks
that the task scanner (task 2) and the model assembler (task 3) consume.

## Skills Required
- **typescript**: Typed pure functions, string/markdown parsing without
  heavyweight runtime dependencies.

## Acceptance Criteria
- [ ] A frontmatter reader parses the leading `---`-delimited block into typed
      fields: scalar strings (`summary`, `created`, `status`, `group`) and
      lists (`dependencies[]`, `skills[]`).
- [ ] The list parser handles both inline-array form (`dependencies: []`,
      `skills: [typescript, jest]`) and dashed-list form
      (`skills:\n  - typescript`), plus quoted and unquoted scalars.
- [ ] Missing or malformed frontmatter degrades to sensible defaults and never
      throws.
- [ ] A body sectioner returns the raw body (everything after the frontmatter)
      AND a map/list of named `##` sections addressable by heading text
      (e.g. "Original Work Order", "Executive Summary", "Architectural
      Approach").
- [ ] A mermaid extractor returns every fenced ` ```mermaid ` block's raw
      source from a body as a list; plans with no mermaid block yield an empty
      list (not an error).
- [ ] The mermaid extractor identifies which block(s) fall within the
      "Architectural Approach" section so the model can flag the canonical one.
- [ ] No `fs.watch`, no `http`/`net` imports, no write operations.
- [ ] `npm run build` and `npm run lint` pass for the new source.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- New source under `src/serve/` (this is the CLI's `tsc` domain; it ships in
  `dist/`). These primitives may live in `workspace-model.ts` or small sibling
  helper files imported by it — keep them internal to the module's domain.
- Pure, synchronous, side-effect-free functions operating on already-read
  string content (file reading itself belongs to the scanner/assembler).
- The existing `src/skill-scripts/shared/frontmatter.ts` only extracts the
  numeric `id`. Do NOT fork or modify it; build a richer, separate reader here.
  Reuse `extractPlanId` only where a numeric id is needed.
- Prefer a purpose-built frontmatter reader over adding a runtime YAML
  dependency. Only use a YAML parser if one is already a project dependency.

## Input Dependencies
None. This is a foundational, zero-dependency task.

## Output Artifacts
- Exported pure functions: a frontmatter reader, a body sectioner, and a
  mermaid extractor (with Architectural-Approach identification), consumed by
  tasks 2 and 3.
- Exported TypeScript types for the parsed frontmatter and section structures.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

Author everything under `src/serve/`. The module entry point is
`src/serve/workspace-model.ts`; these primitives can be small internal
functions there or in sibling files (e.g. `src/serve/markdown.ts`) that the
entry point re-exports as needed.

**Frontmatter reader.** Match the leading block with
`/^---\s*\r?\n([\s\S]*?)\r?\n---/` (same anchor the existing `frontmatter.ts`
uses). For each line inside:
- Split on the first `:`; trim key and value.
- Strip surrounding single or double quotes from scalar values.
- For list fields (`dependencies`, `skills`): if the value after `:` is a
  bracketed inline array like `[a, b]` or `[]`, parse by stripping brackets and
  splitting on commas (empty → `[]`). If the value is empty, look ahead at
  subsequent indented `- item` lines and collect them until the indentation
  ends. Trim and unquote each item. For `dependencies`, coerce numeric items to
  numbers; leave non-numeric as-is rather than throwing.
- Return a typed object with optional fields; absent keys are `undefined` or
  empty arrays. Never throw on a malformed line — skip it.

**Body sectioner.** The body is everything after the closing `---`. Preserve
it verbatim as `rawBody`. Additionally split on `^## ` headings (line-start,
two-hash). Capture each heading's text (the remainder of the line) and the
content up to the next `## ` (or EOF). Return both the rawBody and an ordered
collection keyed by heading text. Section access is additive — never required
for correctness — so callers can fall back to rawBody.

**Mermaid extractor.** Scan the body for fenced blocks opening with a line
matching ` ```mermaid ` (allow trailing whitespace) and closing with a line of
three backticks. Collect the inner source of each. Return them as an ordered
list. Separately, determine for each block whether its byte/line offset falls
within the "Architectural Approach" section's span (use the sectioner output);
expose this so the assembler can mark the canonical diagram. Plan 38's
Architectural Approach mermaid block is the primary fixture — its extracted
source must be non-empty.

Hard boundary: synchronous, read-only, no `fs.watch`, no server/network
imports, no writes. These are pure string functions.
</details>
