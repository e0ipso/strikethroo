---
id: 1
group: "build-pipeline"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["typescript"]
---
# Register task-full-workflow entrypoints in build script

## Objective

Append five `SKILL_ENTRYPOINTS` entries to `scripts/build-skills.cjs` so that `npm run build` emits bundled `.cjs` artifacts for the new `task-full-workflow` skill. No new TypeScript source is required — all five entrypoints already exist under `src/skill-scripts/`.

## Skills Required

- TypeScript (Node.js build tooling, esbuild configuration, CommonJS bundling)

## Acceptance Criteria

- [ ] `scripts/build-skills.cjs` contains five new entries for `skill: 'task-full-workflow'`
- [ ] Each entry maps an existing `src/skill-scripts/` source to the correct output name under `templates/skills/task-full-workflow/scripts/`
- [ ] The five outputs are: `find-task-manager-root.cjs`, `get-next-plan-id.cjs`, `validate-plan-blueprint.cjs`, `get-next-task-id.cjs`, `create-feature-branch.cjs`
- [ ] No other build-script logic is modified
- [ ] `npm run build:skills` completes successfully after the change

## Technical Requirements

- Append entries after the existing `task-execute-task` entries (maintain registration order)
- Use the same object shape as existing entries: `{ src, skill, out }`
- The `src` paths are existing files; do not create or modify any `.ts` files in `src/skill-scripts/`

## Input Dependencies

- Existing build script: `scripts/build-skills.cjs`
- Existing TypeScript entrypoints under `src/skill-scripts/`

## Output Artifacts

- Updated `scripts/build-skills.cjs`

## Implementation Notes

<details>

### Exact entries to append

Add these five objects to `SKILL_ENTRYPOINTS` in order:

```js
  {
    src: 'src/skill-scripts/find-task-manager-root.ts',
    skill: 'task-full-workflow',
    out: 'find-task-manager-root.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-plan-id.ts',
    skill: 'task-full-workflow',
    out: 'get-next-plan-id.cjs',
  },
  {
    src: 'src/skill-scripts/validate-plan-blueprint.ts',
    skill: 'task-full-workflow',
    out: 'validate-plan-blueprint.cjs',
  },
  {
    src: 'src/skill-scripts/get-next-task-id.ts',
    skill: 'task-full-workflow',
    out: 'get-next-task-id.cjs',
  },
  {
    src: 'src/skill-scripts/create-feature-branch.ts',
    skill: 'task-full-workflow',
    out: 'create-feature-branch.cjs',
  },
```

### Verification
After editing, run `npm run build:skills` and confirm that:
- `templates/skills/task-full-workflow/scripts/find-task-manager-root.cjs` exists
- `templates/skills/task-full-workflow/scripts/get-next-plan-id.cjs` exists
- `templates/skills/task-full-workflow/scripts/validate-plan-blueprint.cjs` exists
- `templates/skills/task-full-workflow/scripts/get-next-task-id.cjs` exists
- `templates/skills/task-full-workflow/scripts/create-feature-branch.cjs` exists

These files will be git-ignored by the existing rule (`templates/skills/*/scripts/`).

</details>
