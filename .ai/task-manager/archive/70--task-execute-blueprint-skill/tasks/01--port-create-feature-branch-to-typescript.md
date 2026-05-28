---
id: 1
group: "typescript-source"
dependencies: []
status: "completed"
created: "2026-05-18"
skills:
  - "typescript"
  - "bash"
---
# Port create-feature-branch.cjs to TypeScript and register build entrypoints

## Objective
Add the TypeScript source the `task-execute-blueprint` skill needs at runtime: a new `create-feature-branch.ts` entrypoint (a port of the legacy `templates/ai-task-manager/config/scripts/create-feature-branch.cjs`), a `shared/git-utils.ts` helper for safe git command execution, and three new entries in `scripts/build-skills.cjs` so `npm run build` emits self-contained `.cjs` bundles into the new skill directory.

## Skills Required
- `typescript` — authoring Node CommonJS-compatible entrypoints and shared helpers
- `bash` — understanding git CLI semantics to preserve branch-naming, exit-code, and error-handling behavior

## Acceptance Criteria
- [ ] `src/skill-scripts/create-feature-branch.ts` exists and compiles under `tsconfig.skill-scripts.json`
- [ ] `src/skill-scripts/shared/git-utils.ts` exists and is imported by `create-feature-branch.ts`
- [ ] `create-feature-branch.ts` preserves the exact CLI surface of the legacy `.cjs`:
  - Accepts a single positional argument `<plan-id-or-path>`
  - Resolves the plan using `shared/plan-resolve.ts`
  - Checks git state (repo, current branch, uncommitted changes)
  - Creates a `feature/{planId}--{sanitized-name}` branch when on `main`/`master` with a clean working tree
  - Prints the same success/warning/error messages and uses the same exit codes (`0` = success/already-exists/not-on-main, `1` = error)
- [ ] `scripts/build-skills.cjs` contains three new `SKILL_ENTRYPOINTS` entries for `task-execute-blueprint`:
  - `find-task-manager-root.ts` (reused source, emitted as `find-task-manager-root.cjs`)
  - `validate-plan-blueprint.ts` (reused source, emitted as `validate-plan-blueprint.cjs`)
  - `create-feature-branch.ts` (new source, emitted as `create-feature-branch.cjs`)
- [ ] `npm run build` runs without errors and produces the three `.cjs` files under `templates/skills/task-execute-blueprint/scripts/`
- [ ] The generated `.cjs` files are git-ignored by the existing `templates/skills/*/scripts/` rule
- [ ] `npm run lint` and `npm run build` pass after the changes

## Technical Requirements
- The TypeScript port must import `resolvePlan` from `./shared/plan-resolve.ts` so `esbuild` bundles it into a self-contained `.cjs`
- `git-utils.ts` should expose a thin wrapper around `child_process.execSync` that swallows errors and returns `string | null`
- No changes to `templates/ai-task-manager/config/scripts/create-feature-branch.cjs` or other legacy `.cjs` files
- No changes to the main `tsconfig.json` exclusions are required

## Input Dependencies
- Existing `templates/ai-task-manager/config/scripts/create-feature-branch.cjs` (treat as the reference specification)
- Existing `src/skill-scripts/shared/plan-resolve.ts` and `src/skill-scripts/shared/root.ts`
- Existing `scripts/build-skills.cjs` with the `SKILL_ENTRYPOINTS` array

## Output Artifacts
- `src/skill-scripts/create-feature-branch.ts`
- `src/skill-scripts/shared/git-utils.ts`
- Updated `scripts/build-skills.cjs`
- Generated `templates/skills/task-execute-blueprint/scripts/*.cjs` (after `npm run build`)

## Implementation Notes

<details>

### Porting checklist

1. Read the legacy `create-feature-branch.cjs` carefully. It uses `resolvePlan` from `./shared-utils.cjs`. In the TypeScript port, replace that with `import { resolvePlan } from './shared/plan-resolve'`.

2. The legacy script defines internal helpers `_execGit`, `_isGitRepo`, `_getCurrentBranch`, `_hasUncommittedChanges`, `_branchExists`, `_sanitizeBranchName`, `_extractPlanName`. Move `_execGit` into `shared/git-utils.ts` as a generic `execGit(command: string): string | null` helper. Keep the rest in `create-feature-branch.ts`.

3. `git-utils.ts` should look roughly like:
   ```typescript
   import { execSync } from 'child_process';
   export const execGit = (command: string): string | null => {
     try {
       return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
     } catch (_error) {
       return null;
     }
   };
   ```

4. The `create-feature-branch.ts` entrypoint should expose `main(startPath?: string)` and a self-invocation guard exactly like the other entrypoints (`find-task-manager-root.ts`, `validate-plan-blueprint.ts`).

5. Branch naming logic must be identical to the legacy script:
   - Lowercase the plan name
   - Replace non-alphanumeric chars with hyphens
   - Collapse multiple hyphens
   - Trim leading/trailing hyphens
   - Truncate to 60 chars

6. In `scripts/build-skills.cjs`, append three objects to `SKILL_ENTRYPOINTS` after the existing `task-generate-tasks` entries. Set `skill: 'task-execute-blueprint'` and use the same `src` paths as the existing entries where source is reused.

7. Run `npm run build` to verify the bundles are emitted into `templates/skills/task-execute-blueprint/scripts/`.

8. Run `npm run lint` to catch formatting or type issues.

</details>
