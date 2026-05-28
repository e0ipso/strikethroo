---
id: 1
group: "skill-scripts"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["typescript"]
status: "completed"
status: "completed"
---
# Port check-task-dependencies.cjs to TypeScript and register in build pipeline

## Objective

Create `src/skill-scripts/check-task-dependencies.ts` as a TypeScript port of the legacy `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`, preserving the exact CLI surface, output format, and behavior. Also register the three skill entrypoints in `scripts/build-skills.cjs` so `npm run build` emits bundled artifacts for `task-execute-task`.

## Skills Required

- TypeScript (porting CommonJS logic, Node.js fs/path APIs, CLI argument parsing)

## Acceptance Criteria

- [ ] `src/skill-scripts/check-task-dependencies.ts` exists and type-checks via `tsc --noEmit -p tsconfig.skill-scripts.json`
- [ ] The port accepts `<plan-id-or-path> <task-id>` and exits 0 when all dependencies are `completed`, 1 otherwise
- [ ] Padded and unpadded task ID handling works identically to the legacy `.cjs` (raw, zero-padded, stripped variations)
- [ ] Dependency extraction handles both YAML array syntax (`dependencies: [1, 2]`) and list syntax
- [ ] Status extraction reads the `status` field from task frontmatter
- [ ] Colored output messages and the dependency summary table match the legacy format semantically
- [ ] `scripts/build-skills.cjs` contains three new `SKILL_ENTRYPOINTS` entries for `task-execute-task`
- [ ] No existing source files are modified except `scripts/build-skills.cjs`

## Technical Requirements

- Import `resolvePlan` from `./shared/plan-resolve`
- Implement `_findTaskFile`, `_extractDependencies`, and `_extractStatus` inline (no shared helper for these exists)
- Preserve the existing `module.exports = { _main }` pattern for testability, plus the `if (require.main === module)` guard
- The new file must lint cleanly with the project's ESLint rules

## Input Dependencies

- Legacy reference: `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`
- Shared helpers: `src/skill-scripts/shared/plan-resolve.ts`

## Output Artifacts

- `src/skill-scripts/check-task-dependencies.ts`
- Updated `scripts/build-skills.cjs` with three appended entries

## Implementation Notes

<details>

### Porting strategy
Treat the legacy `.cjs` as the authoritative reference. Copy the logic structure faithfully, converting `require` to `import` and adding TypeScript type annotations where they improve clarity without changing semantics.

### `resolvePlan` usage
Call `resolvePlan(inputId)` (from `./shared/plan-resolve`) to resolve the plan directory. It returns `{ planDir, planId }` or `null`.

### Frontmatter extraction
The shared `frontmatter.ts` only exports `extractPlanId`. You must implement your own frontmatter block extraction by matching `/^---\s*\r?\n([\s\S]*?)\r?\n---/` on the file content, then parsing `dependencies:` and `status:` from that block using the same regex logic the legacy `.cjs` uses.

### `_findTaskFile` logic
Generate three ID variations: `taskId`, `taskId.padStart(2, '0')`, and `taskId.replace(/^0+/, '') || '0'`. Deduplicate them, then scan the `tasks/` directory for a file starting with `<variation>--` and ending with `.md`.

### `_extractDependencies` logic
Walk frontmatter lines line-by-line. When a line matches `/^dependencies:/`, enter dependency-parsing mode. If the same line contains `[...]`, parse it as an inline array. Otherwise, consume subsequent indented `-` list items until a non-indented, non-list line appears.

### `_extractStatus` logic
Find the first line matching `/^status:/`, strip the key and surrounding quotes, and return the trimmed value.

### Build pipeline registration
Append exactly these three objects to `SKILL_ENTRYPOINTS` in `scripts/build-skills.cjs`:

```js
{ src: 'src/skill-scripts/find-task-manager-root.ts', skill: 'task-execute-task', out: 'find-task-manager-root.cjs' },
{ src: 'src/skill-scripts/validate-plan-blueprint.ts', skill: 'task-execute-task', out: 'validate-plan-blueprint.cjs' },
{ src: 'src/skill-scripts/check-task-dependencies.ts', skill: 'task-execute-task', out: 'check-task-dependencies.cjs' },
```

Place them after the existing `task-refine-plan` entries. No other changes to `build-skills.cjs`.

### Error handling
Preserve the existing error messages and exit codes:
- Invalid arg count → exit 1 with usage message
- Plan not found → exit 1 with `[ERROR] Plan "..." not found or invalid`
- Task not found → exit 1 with `Task with ID ... not found in plan ...`
- Dependencies unresolved → exit 1 with summary table

</details>
