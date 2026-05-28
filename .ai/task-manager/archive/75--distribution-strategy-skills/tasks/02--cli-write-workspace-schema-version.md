---
id: 2
group: "schema-contract"
dependencies: []
status: "completed"
created: 2026-05-20
skills:
  - typescript
---
# Persist `workspaceSchemaVersion` from the CLI and nudge users to install skills

## Objective
Extend the CLI's metadata pipeline so every `init` records `workspaceSchemaVersion: 1` in `.ai/task-manager/.init-metadata.json`, gracefully backfills the field for existing workspaces on read, and emits a single-line nudge directing users to `npx skills add e0ipso/ai-task-manager`. This task delivers the CLI side of the schema contract and the Workstream 4 refocus message in one cohesive change.

## Skills Required
- `typescript` — type extension, metadata read/write helpers, conditional output in the init flow.

## Acceptance Criteria
- [ ] `InitMetadata` interface in `src/types.ts` has a `workspaceSchemaVersion: number` field.
- [ ] A `CURRENT_WORKSPACE_SCHEMA_VERSION` constant (value `1`) is exported from `src/metadata.ts`.
- [ ] `saveMetadata` writes the constant into the JSON payload.
- [ ] `loadMetadata` backfills missing `workspaceSchemaVersion` as `1` and does not reject pre-existing valid metadata files.
- [ ] The metadata block written near `src/index.ts` line 337 includes `workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION`.
- [ ] On successful `init` completion, the CLI prints exactly one line of the form: `Next: run \`npx skills add e0ipso/ai-task-manager\` to install the task skills for your assistant(s).`
- [ ] `src/conflict-detector.ts` continues to exclude `.init-metadata.json` from the hash comparison set (verify, do not alter behavior).
- [ ] Existing `npm test` suite passes; any metadata-related tests are updated to expect the new field.

## Technical Requirements
- Single integer field, distinct from the pre-existing `version` (which records the CLI version string).
- Constant lives in `src/metadata.ts` so the build-skills script can import it at build time without pulling in the rest of the metadata module (the skill-side esbuild `define` in task 3 will read this constant).
- Backfill rule for `loadMetadata`: if `metadata.workspaceSchemaVersion` is `undefined`, set it to `1` in-memory before returning. Do not write to disk during a read.
- Nudge line must be emitted exactly once per init invocation, after the success summary, regardless of which assistant(s) were selected. Use the project's existing logger/console approach (match how other success messages are printed in `init`).

## Input Dependencies
None — this task touches files distinct from task 1's restructure changes, so the two can run in parallel.

## Output Artifacts
- Updated `src/types.ts`, `src/metadata.ts`, `src/index.ts`.
- Exported `CURRENT_WORKSPACE_SCHEMA_VERSION` constant consumed by task 3's build-time substitution.
- Written `workspaceSchemaVersion: 1` in `.init-metadata.json` for every fresh or re-run `init`.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. **Extend the type in `src/types.ts`**
   Locate the `InitMetadata` interface (around line 245) and add the field. Place it after `version` for narrative clarity:
   ```ts
   export interface InitMetadata {
     version: string;
     workspaceSchemaVersion: number;
     timestamp: string;
     files: Record<string, string>;
   }
   ```
   Update the JSDoc above the new field: `Workspace schema version. Bumped only when .ai/task-manager/ shape changes incompatibly.`

2. **Add and export the constant in `src/metadata.ts`**
   Near the top of the file (after imports), add:
   ```ts
   export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1;
   ```
   This is the version baked into the CLI build. Bump it (and only it) when the workspace shape changes incompatibly.

3. **Update `loadMetadata` for graceful backfill**
   The current validation (around line 45) is:
   ```ts
   if (!metadata.version || !metadata.timestamp || !metadata.files) {
     // reject
   }
   ```
   Do not add `workspaceSchemaVersion` to that required-fields check. Instead, after the existing validation succeeds, backfill:
   ```ts
   if (typeof metadata.workspaceSchemaVersion !== 'number') {
     metadata.workspaceSchemaVersion = 1;
   }
   ```
   Existing user workspaces will silently gain the field on first read; nothing breaks.

4. **Write the field in `src/index.ts`**
   Locate the metadata-construction block around line 337:
   ```ts
   const metadata = {
     version: getPackageVersion(),
     timestamp: new Date().toISOString(),
     files,
   };
   ```
   Add the import for `CURRENT_WORKSPACE_SCHEMA_VERSION` at the top of the file (alongside the existing `saveMetadata` import) and update the object:
   ```ts
   const metadata: InitMetadata = {
     version: getPackageVersion(),
     workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
     timestamp: new Date().toISOString(),
     files,
   };
   ```
   The explicit `InitMetadata` annotation catches future field additions at compile time.

5. **Emit the post-init nudge**
   Find where `init()` prints its final success summary in `src/index.ts` (search for the existing completion log near the end of the `init` function around lines 200-226). Immediately after the success message, append:
   ```ts
   console.log('Next: run `npx skills add e0ipso/ai-task-manager` to install the task skills for your assistant(s).');
   ```
   Match the existing project's preferred output channel (if other success messages use a logger wrapper, use that; otherwise plain `console.log` is fine).

6. **Verify `.init-metadata.json` is not hash-tracked**
   Open `src/conflict-detector.ts` and confirm there's no path that includes `.init-metadata.json` in the file set being hashed. The metadata file is the tracker itself, not a tracked file. No code change expected — this is a sanity check, not an edit.

7. **Update tests**
   - In `src/__tests__/`, look for any test that constructs an `InitMetadata` object or asserts on the parsed JSON shape. Add the new field to fixtures.
   - If `cli.integration.test.ts` asserts on a substring in the init output, update or extend it to account for the new nudge line (or assert it explicitly).
   - Run `npm test` and resolve any failures arising from the type change.

8. **Local smoke test**
   ```bash
   npm run build
   node dist/cli.js init --assistants claude --destination-directory /tmp/schema-test --force
   jq '.workspaceSchemaVersion' /tmp/schema-test/.ai/task-manager/.init-metadata.json
   # expect: 1
   ```

**Pitfalls to avoid**:
- Do not promote `workspaceSchemaVersion` to a required-on-read field. Backfilling preserves backwards compatibility with already-deployed metadata files.
- Do not write the backfilled value back to disk during read — that's a side effect of `loadMetadata` users won't expect.
- Do not bump the constant past `1`. The first real bump happens later when an actual incompatible workspace change ships.
- Do not add the nudge inside the per-assistant loop; it must print exactly once per init invocation.

</details>
