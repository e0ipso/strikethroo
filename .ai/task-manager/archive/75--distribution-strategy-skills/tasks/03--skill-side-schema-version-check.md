---
id: 3
group: "schema-contract"
dependencies: [1, 2]
status: "completed"
created: 2026-05-20
skills:
  - typescript
---
# Bake `EXPECTED_WORKSPACE_SCHEMA_VERSION` into skill bundles and fail loudly on mismatch

## Objective
Teach the shared skill-side root resolver to compare the workspace's `workspaceSchemaVersion` against an expected value baked into each bundle at build time via esbuild's `define`. Mismatches must exit non-zero with an actionable error message naming the precise re-run command (CLI `init` or `skills add`). Add a post-build smoke assertion guaranteeing the literal name was substituted (not left as a string in the bundles).

## Skills Required
- `typescript` — extending `src/skill-scripts/shared/root.ts` and wiring the esbuild `define` substitution in `scripts/build-skills.cjs`.

## Acceptance Criteria
- [ ] `src/skill-scripts/shared/root.ts` (or a sibling module under `src/skill-scripts/shared/`) declares an `EXPECTED_WORKSPACE_SCHEMA_VERSION` integer referenced via a `declare const` (so esbuild can substitute it at build time).
- [ ] After locating `.init-metadata.json`, the resolver compares the workspace's `workspaceSchemaVersion` (backfilled to `1` when absent) against `EXPECTED_WORKSPACE_SCHEMA_VERSION`.
- [ ] Match → resolver returns the path as before.
- [ ] Workspace older than expected → resolver prints to stderr `Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update.` and exits with code `1`.
- [ ] Workspace newer than expected → resolver prints to stderr `This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills.` and exits with code `1`.
- [ ] `scripts/build-skills.cjs` reads `CURRENT_WORKSPACE_SCHEMA_VERSION` from `src/metadata.ts` (or `src/types.ts`/`src/metadata.ts` equivalent) and passes it to esbuild via the `define` option as `EXPECTED_WORKSPACE_SCHEMA_VERSION: '<integer-literal>'`.
- [ ] After bundling, `grep -l 'EXPECTED_WORKSPACE_SCHEMA_VERSION' skills/*/scripts/*.cjs` returns empty (the literal name was fully substituted).
- [ ] Build script fails (non-zero exit) if the smoke assertion finds any bundle still containing the literal string `EXPECTED_WORKSPACE_SCHEMA_VERSION`.
- [ ] `findTaskManagerRoot` keeps its existing `null` semantics for the "no workspace found" case (the schema check fires only when a workspace IS found — missing workspace is not a version mismatch).

## Technical Requirements
- esbuild `define` accepts string values that must serialize to JS literals (`'1'`, not `1`). Read the integer from `src/metadata.ts` at build time and stringify it.
- Use TypeScript's `declare const EXPECTED_WORKSPACE_SCHEMA_VERSION: number;` ambient declaration so the source type-checks without importing a value from anywhere — esbuild replaces the identifier with the literal during bundling.
- Error messages must be exactly the strings listed in the acceptance criteria (the documentation task quotes them verbatim).
- The schema check runs inside the existing `isValidTaskManagerRoot` flow or immediately after a successful resolution — either pattern is acceptable as long as the error is emitted before the function returns to the calling skill script.

## Input Dependencies
- Task 1: `skills/` is the new bundle output root; the smoke assertion grep targets `skills/*/scripts/*.cjs`.
- Task 2: `CURRENT_WORKSPACE_SCHEMA_VERSION` exported from `src/metadata.ts` is the source of truth read by the build script.

## Output Artifacts
- Updated `src/skill-scripts/shared/root.ts` with the schema check.
- Updated `scripts/build-skills.cjs` with the `define` injection and post-build assertion.
- All six built skill bundles in `skills/<name>/scripts/*.cjs` contain the integer literal substituted for `EXPECTED_WORKSPACE_SCHEMA_VERSION`.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. **Declare the build-time constant in the shared module**
   At the top of `src/skill-scripts/shared/root.ts` (above the existing imports):
   ```ts
   declare const EXPECTED_WORKSPACE_SCHEMA_VERSION: number;
   ```
   This is an ambient declaration. TypeScript treats it as an existing global; esbuild's `define` substitutes the identifier wherever it appears with a literal integer.

2. **Add the schema-check helper**
   Add a helper function alongside `isValidTaskManagerRoot`:
   ```ts
   const checkWorkspaceSchema = (metadataPath: string): void => {
     const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
     const actual = typeof metadata.workspaceSchemaVersion === 'number'
       ? metadata.workspaceSchemaVersion
       : 1;
     if (actual === EXPECTED_WORKSPACE_SCHEMA_VERSION) return;
     if (actual < EXPECTED_WORKSPACE_SCHEMA_VERSION) {
       process.stderr.write(
         `Workspace schema v${actual} is older than this skill requires (v${EXPECTED_WORKSPACE_SCHEMA_VERSION}). ` +
         `Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update.\n`
       );
     } else {
       process.stderr.write(
         `This skill (built for workspace schema v${EXPECTED_WORKSPACE_SCHEMA_VERSION}) is older than the workspace (v${actual}). ` +
         `Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills.\n`
       );
     }
     process.exit(1);
   };
   ```
   Keep the messages exact (the docs task quotes them verbatim and they are part of the acceptance criteria).

3. **Wire the check into the resolver**
   Modify `findTaskManagerRoot` so that when a valid root is found, the schema check runs before the path is returned:
   ```ts
   export const findTaskManagerRoot = (startPath: string = process.cwd()): string | null => {
     const paths = getParentPaths(startPath);
     const found = paths.find(p => getTaskManagerAt(p));
     if (!found) return null;
     const root = getTaskManagerAt(found);
     if (root) checkWorkspaceSchema(path.join(root, '.init-metadata.json'));
     return root;
   };
   ```
   If the schema check fails it calls `process.exit(1)` and the function never returns — that's intentional.

4. **Wire `define` in the build script**
   In `scripts/build-skills.cjs`, near the top where constants are defined, import the current version:
   ```js
   const { CURRENT_WORKSPACE_SCHEMA_VERSION } = require(path.join(REPO_ROOT, 'dist', 'metadata.js'));
   ```
   This requires the TypeScript compile step (`tsc`) to run before `build-skills.cjs`. The existing `npm run build` orchestration already does that (`tsc` → `build:skills`).

   In the esbuild invocation (search for `esbuild.build` or `esbuild.buildSync` in the file), add the `define` option:
   ```js
   define: {
     EXPECTED_WORKSPACE_SCHEMA_VERSION: JSON.stringify(CURRENT_WORKSPACE_SCHEMA_VERSION),
   },
   ```
   `JSON.stringify(1)` → `"1"`, which esbuild substitutes as the literal `1`. The TS ambient `declare const` declares it as a `number`, so call sites compile without complaint.

5. **Post-build smoke assertion**
   After the esbuild step finishes, iterate the produced bundles and assert the literal name is gone:
   ```js
   const builtFiles = []; // collected during the build loop
   for (const file of builtFiles) {
     const contents = fs.readFileSync(file, 'utf8');
     if (contents.includes('EXPECTED_WORKSPACE_SCHEMA_VERSION')) {
       console.error(`Build smoke check failed: ${file} still contains EXPECTED_WORKSPACE_SCHEMA_VERSION literal`);
       process.exit(1);
     }
   }
   ```
   If `builtFiles` isn't already collected in the existing loop, capture the `dest` paths as the loop produces them.

6. **Build and validate**
   ```bash
   npm run build
   grep -l 'EXPECTED_WORKSPACE_SCHEMA_VERSION' skills/*/scripts/*.cjs
   # expect: empty
   ```

7. **Manual mismatch test**
   ```bash
   mkdir -p /tmp/schema-mismatch/.ai/task-manager
   echo '{"version":"x","workspaceSchemaVersion":0,"timestamp":"2026-05-20","files":{}}' > /tmp/schema-mismatch/.ai/task-manager/.init-metadata.json
   (cd /tmp/schema-mismatch && node /workspace/skills/task-create-plan/scripts/<entrypoint>.cjs ; echo "exit=$?")
   # expect: stderr message naming `npx @e0ipso/ai-task-manager init`; exit non-zero
   ```

**Pitfalls to avoid**:
- Do not import `CURRENT_WORKSPACE_SCHEMA_VERSION` at runtime in the skill source — the whole point of `define` is to fix the value at build time so the shipped bundle is self-contained.
- Do not include the literal `EXPECTED_WORKSPACE_SCHEMA_VERSION` in any error message string; that would defeat the smoke assertion. Use the substituted value (which by that point is just an integer expression).
- Do not error when `.init-metadata.json` is missing (workspace not initialized) — `findTaskManagerRoot` already returns `null` in that path, and the schema check only fires when a workspace IS located.
- Do not change `getPackageVersion` or `version` semantics — the schema version is intentionally orthogonal to the CLI version.

</details>
