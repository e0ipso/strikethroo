---
id: 1
group: "build-pipeline"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["build-tools", "nodejs"]
---
# Register task-refine-plan entrypoints in build script

## Objective
Append two entries to the `SKILL_ENTRYPOINTS` array in `scripts/build-skills.cjs` so that `npm run build` produces bundled `.cjs` files for the `task-refine-plan` skill.

## Skills Required
- `build-tools`: Familiarity with the esbuild-driven bundle script.
- `nodejs`: Understanding of CommonJS packaging and the existing entrypoint registry pattern.

## Acceptance Criteria
- [ ] Two new objects are appended to `SKILL_ENTRYPOINTS` in `scripts/build-skills.cjs`:
  - `{ src: 'src/skill-scripts/find-task-manager-root.ts', skill: 'task-refine-plan', out: 'find-task-manager-root.cjs' }`
  - `{ src: 'src/skill-scripts/validate-plan-blueprint.ts', skill: 'task-refine-plan', out: 'validate-plan-blueprint.cjs' }`
- [ ] The array ordering places the new entries after the existing `task-execute-blueprint` entries (or logically grouped).
- [ ] `npm run build:skills` runs without errors after the change.
- [ ] `templates/skills/task-refine-plan/scripts/` contains the two generated `.cjs` files after a successful build.

## Technical Requirements
- Edit only `scripts/build-skills.cjs`; no other build-script logic changes.
- Follow the exact object schema used by existing entries (`src`, `skill`, `out`).

## Input Dependencies
None — this is a standalone configuration change.

## Output Artifacts
- Modified `scripts/build-skills.cjs` with two additional `SKILL_ENTRYPOINTS` entries.
- Generated `templates/skills/task-refine-plan/scripts/find-task-manager-root.cjs`
- Generated `templates/skills/task-refine-plan/scripts/validate-plan-blueprint.cjs`

## Implementation Notes
<details>
Open `scripts/build-skills.cjs`. Locate the `SKILL_ENTRYPOINTS` array. Append the two new entries exactly as shown in the acceptance criteria. Save the file. Run `npm run build:skills` to verify the bundles are created in `templates/skills/task-refine-plan/scripts/`.
</details>
