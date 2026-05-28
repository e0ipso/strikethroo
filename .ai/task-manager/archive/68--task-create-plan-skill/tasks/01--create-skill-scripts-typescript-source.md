---
id: 1
group: "typescript-source"
dependencies: []
status: "completed"
created: "2026-05-14"
skills:
  - typescript
---
# Create centralized TypeScript source for skill scripts

## Objective
Establish `src/skill-scripts/` as the single maintained source for the executable logic the `task-create-plan` skill needs at runtime. Port the helpers the existing create-plan command relies on (locating the task-manager root and allocating the next plan ID) into TypeScript, plus any shared utilities they depend on. The directory must lint and type-check alongside the rest of `src/`.

## Skills Required
- `typescript`: author idiomatic, type-safe Node CommonJS-targeted modules and entrypoints that compile through the existing `tsc` configuration.

## Acceptance Criteria
- [ ] New directory `src/skill-scripts/` exists and is included in the project's TypeScript configuration (lints and type-checks with the rest of `src/`).
- [ ] At least two entrypoint modules exist under `src/skill-scripts/`: one that locates the `.ai/task-manager` root from a starting path, and one that computes the next plan ID for that root.
- [ ] Plan ID allocation logic faithfully mirrors the semantics of `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs`, including scanning both `plans/` and `archive/` and recognizing both `.md` and `.html` plan files.
- [ ] Each entrypoint is invokable directly (i.e. exports a `main` and runs it when executed as a script after bundling) and prints its result to stdout in the same shape the existing `.cjs` counterparts produce.
- [ ] Shared logic (file walking, frontmatter parsing, plan/archive scanning) lives in co-located modules under `src/skill-scripts/` so each entrypoint stays small.
- [ ] `tsc` does NOT emit anything for `src/skill-scripts/` into `dist/` (these outputs are produced by the bundler in task 2). Either configure `tsc` to exclude this subtree from emit or otherwise prevent its inclusion in the published `dist/` payload.
- [ ] `npm run lint` and `npm run build` continue to succeed; no type errors introduced.

## Technical Requirements
- TypeScript targeting Node CommonJS (matches existing `tsconfig.json` output target).
- Reference implementations to mirror: `templates/ai-task-manager/config/scripts/find-root.cjs`, `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs`, and `templates/ai-task-manager/config/scripts/shared-utils.cjs`.
- No new runtime dependencies; rely on Node's built-in `fs`, `path`, and existing dev tooling.
- Entrypoint modules must be importable from a bundler with no implicit dependency on the repository layout (use only relative imports and Node built-ins).

## Input Dependencies
None.

## Output Artifacts
- `src/skill-scripts/find-task-manager-root.ts` (or similar entrypoint name) — locates the task-manager root from `process.cwd()` or a passed argument.
- `src/skill-scripts/get-next-plan-id.ts` — allocates the next plan ID for a given task-manager root.
- One or more shared helper modules co-located under `src/skill-scripts/` (e.g. `shared/plan-scan.ts`, `shared/frontmatter.ts`).
- Updates to `tsconfig.json` (or a sibling config) so `src/skill-scripts/` is type-checked but not emitted into `dist/`.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Inspect the existing reference scripts** under `templates/ai-task-manager/config/scripts/`:
   - `find-root.cjs`: walks up from a starting directory looking for `.ai/task-manager/.init-metadata.json` (or similar marker). Note the exact marker file and printed output format.
   - `get-next-plan-id.cjs`: reads `plans/` and `archive/` subdirectories, parses each plan file's frontmatter to extract `id`, and returns `max(id) + 1`.
   - `shared-utils.cjs`: contains shared helpers including `getAllPlans`, frontmatter parsing, and ID extraction logic. Note that `getAllPlans` already filters by `.md`, but the plan explicitly requires the TypeScript port to also recognize `.html` plan files (because plan 68 itself is `.html`).
2. **Create the directory layout**:
   ```
   src/skill-scripts/
     find-task-manager-root.ts
     get-next-plan-id.ts
     shared/
       plan-scan.ts        # enumerate plans across plans/ and archive/
       frontmatter.ts      # parse YAML frontmatter from .md OR <meta> tags from .html
       root.ts             # walk-up helper used by find-task-manager-root
   ```
3. **Implement `shared/root.ts`**: export a `findTaskManagerRoot(startDir: string): string | null` that walks up from `startDir`, checking for `.ai/task-manager/.init-metadata.json` whose JSON parses and contains a `version` field. Return the absolute path to `.ai/task-manager` or `null`.
4. **Implement `shared/frontmatter.ts`**: export `parseFrontmatter(content: string, filePath: string): { id: number | null }`. For `.md` files, extract the leading `---`-delimited YAML block and read `id:` (handle quoted/unquoted, padded-zero numerics). For `.html` files, look for `<meta name="id" content="...">` inside `<head>`. Return `id: null` if not found or unparseable.
5. **Implement `shared/plan-scan.ts`**: export `getAllPlans(taskManagerRoot: string): Array<{ id: number; file: string; dir: string; isArchive: boolean }>`. Enumerate subdirectories of `${root}/plans/` and `${root}/archive/`; inside each, find a `plan-*.{md,html}` file; parse its frontmatter for an ID; include only entries with a valid numeric ID.
6. **Implement `find-task-manager-root.ts` entrypoint**: import `findTaskManagerRoot`, call it with `process.cwd()` (or `process.argv[2]` if provided), `console.log(absolutePath)` and `process.exit(0)` on success; on miss, exit non-zero with a clear error to `stderr`. Match the stdout format of the existing `.cjs`.
7. **Implement `get-next-plan-id.ts` entrypoint**: import `findTaskManagerRoot` and `getAllPlans`. Resolve the root from `process.argv[2]` if given, else from `process.cwd()`. Compute `max(...ids, 0) + 1`. Print the integer to stdout. Match the existing `.cjs` output shape.
8. **Wrap entrypoint execution** in a `if (require.main === module) { main(); }` guard so the modules are also import-safe for tests.
9. **Update `tsconfig.json`** so `src/skill-scripts/**` is type-checked but excluded from `tsc` emit. Easiest pattern: add `"exclude": ["src/skill-scripts/**"]` to the main `tsconfig.json` build config, and add a sibling `tsconfig.skill-scripts.json` with `"noEmit": true, "include": ["src/skill-scripts/**"]` referenced from `npm run lint` if needed. The simpler approach is to add `src/skill-scripts/**` to the main config's `exclude` array (tsc won't emit) and trust ESLint/the bundler for type checking via `--noEmit` invocation in the build script (task 2). Pick whichever fits the existing tooling style.
10. **Do NOT modify any file under `templates/ai-task-manager/config/scripts/`.** Those existing `.cjs` files must remain byte-identical per the compatibility boundary.
11. **Verify**: run `npm run lint` and `npm run build` — both must pass with zero new warnings or errors.

</details>
