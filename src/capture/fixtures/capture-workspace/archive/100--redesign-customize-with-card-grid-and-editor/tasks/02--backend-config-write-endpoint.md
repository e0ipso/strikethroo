---
id: 2
group: "serve-backend"
dependencies: []
status: "completed"
created: 2026-06-02
skills:
  - node
  - api-endpoints
---
# Backend: workspace-relative path + guarded config write endpoint

## Objective
Extend the serve backend so (a) the read model surfaces a workspace-relative
path for each config file, and (b) a new guarded `PUT /api/config/:kind/:id`
endpoint overwrites an existing hook/template file in place under a strict
allowlist. This is the second sanctioned workspace mutation (after archive).

## Skills Required
- `node` — `fs`/`path` work, traversal-safe path resolution in the serve layer.
- `api-endpoints` — add and dispatch a new HTTP route with typed results and correct status codes.

## Acceptance Criteria
- [ ] `getConfig` in `src/serve/workspace-model.ts` adds a `relPath` field to each `ConfigFile` (path relative to `<root>`, e.g. `config/hooks/POST_PLAN.md`), and the `ConfigFile` interface there declares it.
- [ ] A new module `src/serve/config-write.ts` exports a function (e.g. `writeConfigFile(root, kind, id, content)`) returning a discriminated result `{ ok: true; ... } | { ok: false; reason: 'invalid-kind' | 'invalid-id' | 'not-found' | 'fs-error'; message }`, mirroring `archive.ts`.
- [ ] The function: rejects any `kind` other than `hooks`/`templates`; resolves `config/<kind>/<id>.md`, canonicalizes it, and rejects any path that escapes the intended directory (traversal); requires the target file to already exist (no create); overwrites content verbatim; never deletes/renames.
- [ ] `src/serve/server.ts` dispatches `PUT /api/config/:kind/:id` (method-guarded) → reads the JSON body → calls the function → maps `reason` to status (`400` invalid-kind/invalid-id, `404` not-found, `500` fs-error, `200` success).
- [ ] The request body-size cap is large enough for real config files (raise `MAX_BODY_BYTES` or use a per-route cap) and returns a clear error on overflow.
- [ ] Unit tests (Vitest) cover the guard: unknown kind → invalid-kind; traversal id (`../../x`) → invalid-id; non-existent file → not-found; happy path overwrites and the new bytes are readable.
- [ ] No file is created, deleted, or modified outside `config/hooks/` and `config/templates/` under any input.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Follow the existing typed-result + status-mapping convention (see `archive.ts` and `handleArchive`/`handleApi` in `server.ts`).
- Reuse the existing `readJsonBody` helper; adjust its size cap or add a per-route limit (self-review currently shares the 64 KiB cap).
- Path containment: resolve with `path.resolve` and verify the result starts with the resolved `config/<kind>/` directory + separator, mirroring the `handleStatic` traversal guard.
- The success response should return the refreshed config slice or the refreshed single file model so the client can update without a second fetch (the existing SSE stream will also fire).

## Input Dependencies
None (pure backend; the client wiring in Task 3 consumes these).

## Output Artifacts
- `src/serve/workspace-model.ts` (`relPath` on `ConfigFile`).
- `src/serve/config-write.ts` (new guarded mutation module).
- `src/serve/server.ts` (new `PUT` route dispatch + body-cap change).
- Unit test file for the write guards.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. `relPath`: in `enumerateConfigDir`, you have `dir` and the file name; compute `path.relative(root, file)`. But `enumerateConfigDir` currently only gets `dir`. Pass `root` (or the `config` segment) in so it can produce `config/<kind>/<name>`. Keep `file` (absolute) as-is for the write resolution and add `relPath` alongside.
2. `config-write.ts`:
   ```ts
   import * as fs from 'fs';
   import * as path from 'path';
   export type ConfigWriteResult = { ok: true } | { ok: false; reason: 'invalid-kind' | 'invalid-id' | 'not-found' | 'fs-error'; message: string };
   const KINDS = new Set(['hooks', 'templates']);
   export const writeConfigFile = async (root: string, kind: string, id: string, content: string): Promise<ConfigWriteResult> => {
     if (!KINDS.has(kind)) return { ok: false, reason: 'invalid-kind', message: `Unknown config kind: ${kind}.` };
     const dir = path.resolve(root, 'config', kind);
     const target = path.resolve(dir, `${id}.md`);
     if (target !== dir + path.sep + path.basename(target) || !target.startsWith(dir + path.sep)) {
       return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
     }
     try {
       const stat = await fs.promises.stat(target);
       if (!stat.isFile()) return { ok: false, reason: 'not-found', message: 'Config file not found.' };
     } catch {
       return { ok: false, reason: 'not-found', message: 'Config file not found.' };
     }
     try {
       await fs.promises.writeFile(target, content, 'utf8');
       return { ok: true };
     } catch {
       return { ok: false, reason: 'fs-error', message: 'Failed to write config file.' };
     }
   };
   ```
   Note: the `id` must contain no path separators or `..`; the `startsWith(dir + sep)` check plus a basename equality check enforces a single flat filename. Reject ids containing `/`, `\`, or `..` early for clarity.
3. `server.ts` route (near the other POST branches around line 358):
   ```ts
   if (req.method === 'PUT' && /^\/api\/config\/[^/]+\/[^/]+\/?$/.test(pathname)) {
     // parse kind + id from pathname, read body { content }, call writeConfigFile, map result to status, return refreshed getConfig(root)
   }
   ```
   `decodeURIComponent` the id segment before passing it in.
4. Body cap: raise `MAX_BODY_BYTES` (e.g. to 1 MiB) or branch a larger cap for this route; config files are markdown and can exceed 64 KiB with edits.
5. Tests: write into a temp workspace dir (mirror existing serve/integration test setup) — create `config/hooks/SAMPLE.md`, exercise each branch, and assert the bytes after the happy-path write. Test philosophy: this is custom guard logic on a filesystem boundary — exactly the kind of business logic that warrants tests; do not test `fs` itself.
</details>
