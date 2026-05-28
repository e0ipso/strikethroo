---
id: 4
group: "build"
dependencies: [1]
status: "completed"
created: 2026-05-14
skills:
  - typescript
---
# Register task-generate-tasks Entrypoints in Build Pipeline

## Objective
Append three entries to the `SKILL_ENTRYPOINTS` array in `scripts/build-skills.cjs` so `npm run build` produces the new skill's bundled scripts: `find-task-manager-root.cjs` (reused), `validate-plan-blueprint.cjs`, and `get-next-task-id.cjs`, all under `templates/skills/task-generate-tasks/scripts/`.

## Skills Required
- `typescript` — modifying the existing CommonJS bundle script and running the build to verify outputs.

## Acceptance Criteria
- [ ] `scripts/build-skills.cjs` `SKILL_ENTRYPOINTS` array contains three new entries with `skill: 'task-generate-tasks'`, sources pointing to the entrypoints created in task 1, and out names `find-task-manager-root.cjs`, `validate-plan-blueprint.cjs`, `get-next-task-id.cjs`.
- [ ] Running `npm run build` from a clean checkout completes without errors and produces exactly three `.cjs` files under `templates/skills/task-generate-tasks/scripts/`.
- [ ] `git status` shows those generated files ignored (covered by the existing `templates/skills/*/scripts/` rule in `.gitignore`).
- [ ] No other change to the bundle script's logic; ordering of existing entries is preserved.

## Technical Requirements
- The order inside the new entries should match the existing convention: `{ src, skill, out }` with src under `src/skill-scripts/`.
- Reuse `find-task-manager-root.ts` (same `src` path as in the first existing entry); the second skill simply gets its own bundled copy emitted to keep it self-contained.

## Input Dependencies
- Task 1 must complete first: the entrypoints `src/skill-scripts/validate-plan-blueprint.ts` and `src/skill-scripts/get-next-task-id.ts` must exist before the build references them.

## Output Artifacts
- Updated `scripts/build-skills.cjs` (additive: 3 array entries).
- Generated (gitignored) bundles under `templates/skills/task-generate-tasks/scripts/`:
  - `find-task-manager-root.cjs`
  - `validate-plan-blueprint.cjs`
  - `get-next-task-id.cjs`

## Implementation Notes

<details>

### Edit shape

Append after the existing `task-create-plan` entries — keep the existing two entries in place. The block to append:

```js
{
  src: 'src/skill-scripts/find-task-manager-root.ts',
  skill: 'task-generate-tasks',
  out: 'find-task-manager-root.cjs',
},
{
  src: 'src/skill-scripts/validate-plan-blueprint.ts',
  skill: 'task-generate-tasks',
  out: 'validate-plan-blueprint.cjs',
},
{
  src: 'src/skill-scripts/get-next-task-id.ts',
  skill: 'task-generate-tasks',
  out: 'get-next-task-id.cjs',
},
```

### Verification

```bash
npm run build
ls templates/skills/task-generate-tasks/scripts/
# expected output (order may vary):
# find-task-manager-root.cjs
# get-next-task-id.cjs
# validate-plan-blueprint.cjs

git status --ignored templates/skills/task-generate-tasks/scripts/
# expected: the three .cjs files appear under "Ignored files"
```

Optional sanity (not required for acceptance): from inside `templates/skills/task-generate-tasks/scripts/`, run `node validate-plan-blueprint.cjs 69 planFile` from the repo root and confirm the script resolves plan 69 in this repo. The path resolution behavior here merely confirms the bundle is wired correctly; full functional testing lives in task 5.

### Out of scope

- Do not touch `package.json` — `npm run build:skills` is already wired.
- Do not commit generated `.cjs`; the existing `.gitignore` rule covers them.
- Do not modify the existing `task-create-plan` entries.

</details>
