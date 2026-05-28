---
id: 1
group: "skill-source"
dependencies: []
status: "completed"
created: 2026-05-14
skills:
  - typescript
---
# Add TypeScript Source for task-generate-tasks Skill

## Objective
Extend `src/skill-scripts/` with the shared helpers and entrypoints the new `task-generate-tasks` skill needs at runtime: two shared helpers under `shared/` (plan resolution by ID/path and per-plan task scanning) and two new entrypoints that port the legacy `validate-plan-blueprint.cjs` and `get-next-task-id.cjs` semantics.

## Skills Required
- `typescript` — authoring the new modules under `src/skill-scripts/` consistent with the existing plan-68 source style.

## Acceptance Criteria
- [ ] `src/skill-scripts/shared/plan-resolve.ts` exists and resolves a plan from a numeric ID or absolute path, recognizing both `.md` and `.html` plans across `plans/` and `archive/`.
- [ ] `src/skill-scripts/shared/task-scan.ts` exists and returns the next available integer task ID for a given plan directory.
- [ ] `src/skill-scripts/validate-plan-blueprint.ts` exists, accepts `<plan-id-or-absolute-path> [field]` with field ∈ `{planFile, planDir, taskCount, blueprintExists, taskManagerRoot, planId}`, and prints either the JSON or the requested field. Output parity with `templates/ai-task-manager/config/scripts/validate-plan-blueprint.cjs` for valid inputs.
- [ ] `src/skill-scripts/get-next-task-id.ts` exists, accepts a plan ID or absolute path, and prints the next integer task ID. Output parity with `templates/ai-task-manager/config/scripts/get-next-task-id.cjs`.
- [ ] All new files type-check under `tsconfig.skill-scripts.json` (no emit). `npm run lint` passes for the new files.
- [ ] No file under `templates/assistant/commands/`, `templates/ai-task-manager/config/scripts/`, or `src/skill-scripts/get-next-plan-id.ts` / `find-task-manager-root.ts` is modified.

## Technical Requirements
- Reuse existing shared modules where natural: `shared/root.ts` (`findTaskManagerRoot`), `shared/plan-scan.ts` (`getAllPlans`), `shared/frontmatter.ts` (`extractPlanId`).
- Match CLI signatures and exit semantics of the legacy `.cjs` reference files. The legacy reference must remain untouched.
- Follow the same module style as `src/skill-scripts/get-next-plan-id.ts` and `find-task-manager-root.ts`: a `main()` function executed under `require.main === module`, exported for testing, with stderr/exit on error and stdout for success output.

## Input Dependencies
None. Uses existing helpers under `src/skill-scripts/shared/`.

## Output Artifacts
- `src/skill-scripts/shared/plan-resolve.ts`
- `src/skill-scripts/shared/task-scan.ts`
- `src/skill-scripts/validate-plan-blueprint.ts`
- `src/skill-scripts/get-next-task-id.ts`

## Implementation Notes

<details>

### plan-resolve.ts (shared)

Mirror the surface of `resolvePlan` from `templates/ai-task-manager/config/scripts/shared-utils.cjs`. Export a single function:

```ts
export interface ResolvedPlan {
  planFile: string;
  planDir: string;
  taskManagerRoot: string;
  planId: number;
}

export const resolvePlan = (
  input: string | number,
  startPath?: string
): ResolvedPlan | null => { /* … */ };
```

Rules:
- If `input` is an absolute path (starts with `/`):
  - Read the file, parse `extractPlanId(content, filePath)` via `shared/frontmatter.ts`. If null → return null.
  - Resolve the task-manager root via a "standard-root shortcut" first (parent-of-parent is `task-manager` and grandparent is `.ai`, and `.init-metadata.json` exists with `version`), else fall back to `findTaskManagerRoot(path.dirname(input))`.
  - If no root → null.
  - Return `{ planFile: input, planDir: path.dirname(input), taskManagerRoot, planId }`.
- Else parse as integer. If `NaN` → null.
- Else hierarchical search: starting at `startPath ?? process.cwd()`, run `findTaskManagerRoot`. Call `getAllPlans(root)` and find the plan whose `id` matches. If found → return resolved. Otherwise climb to parent-of-`path.dirname(root)` and repeat. Use a `Set<string>` keyed by `path.normalize(tmRoot)` to prevent infinite loops. Stop at filesystem root.

Implement the standard-root shortcut as a small private function mirroring `checkStandardRootShortcut` in the legacy reference: returns the task-manager root path if path shape matches `**/.ai/task-manager/{plans|archive}/<plan-dir>/<plan-file>` and the root has valid `.init-metadata.json` with `version`.

### task-scan.ts (shared)

Single function:

```ts
export const computeNextTaskId = (planDir: string): number => { /* … */ };
```

- `tasksDir = path.join(planDir, 'tasks')`.
- If `tasksDir` does not exist → return `1`.
- Read directory entries (with `withFileTypes: true`). For each `.md` file, read content, extract numeric `id` from frontmatter using `shared/frontmatter.ts` `extractPlanId` (the same ID extractor; it generically parses `id:` from YAML frontmatter — confirm by reading the function before using it. If frontmatter helpers do not cover this case, add a small `extractTaskIdFromFrontmatter` to `shared/frontmatter.ts` that reuses the same regex set). Track the max ID. Return `max + 1`. If the directory is empty or unreadable, return `1`.

Skim `shared/frontmatter.ts` first to confirm `extractPlanId` is the correct reuse point; do not introduce a parallel YAML parser.

### validate-plan-blueprint.ts (entrypoint)

CLI: `node validate-plan-blueprint.cjs <plan-id-or-absolute-path> [fieldName]`.

- Read `process.argv[2]` as `inputId`, `process.argv[3]` as `fieldName`.
- Validate `inputId` is provided; otherwise print usage to stderr and exit 1.
- Validate the input is either numeric (allow leading zeros via `parseInt(str, 10)`) or starts with `/`.
- Call `resolvePlan(inputId)`.
- If null → stderr error `Plan ID <id> not found or invalid` plus available-plan list (best-effort: call `getAllPlans` if a task-manager root can be discovered from cwd), exit 1.
- Compute `taskCount` by reading `path.join(planDir, 'tasks')` (count `*.md` files; if dir missing → 0).
- Compute `blueprintExists` by reading `planFile` and testing `/^## Execution Blueprint/m`. Return `'yes' | 'no'`.
- Build the result object: `{ planFile, planDir, taskManagerRoot, planId, taskCount, blueprintExists }`.
- If `fieldName` provided:
  - Valid set: `['planFile', 'planDir', 'taskCount', 'blueprintExists', 'taskManagerRoot', 'planId']`. Otherwise stderr error + exit 1.
  - Write `String(result[fieldName]) + '\n'` to stdout using `process.stdout.write`.
- Else `console.log(JSON.stringify(result, null, 2))`.

Use `process.stdout.write(...)` (not `console.log`) for single-field output to avoid `util.inspect` colorization — match the legacy behavior.

### get-next-task-id.ts (entrypoint)

CLI: `node get-next-task-id.cjs <plan-id-or-absolute-path>`.

- Read `inputId` from `process.argv[2]`. If missing → stderr `Error: Plan ID or path is required`, exit 1.
- `resolved = resolvePlan(inputId)`. If null → stderr `Error: Plan "<inputId>" not found or invalid.`, exit 1.
- `console.log(computeNextTaskId(resolved.planDir))`.

### Lint and type-check

Run, before considering this task done:

```bash
npx tsc --noEmit -p tsconfig.skill-scripts.json
npm run lint
```

Fix any errors in the new files only. Do not modify pre-existing files except as called out (none required).

</details>
