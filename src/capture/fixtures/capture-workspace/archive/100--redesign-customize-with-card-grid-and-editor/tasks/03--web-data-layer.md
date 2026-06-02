---
id: 3
group: "web-data"
dependencies: [1, 2]
status: "completed"
created: 2026-06-02
skills:
  - react
  - typescript
---
# Web data layer: ConfigFile type, description merge, save helper

## Objective
Update the SPA data layer so config files carry `relPath` and a `description`
(merged once from the Task 1 registry, keyed by `id`), and add a single
`saveConfigFile` helper that issues the Task 2 `PUT` and reports success/error.
This is the one merge point for descriptions and the one write path for the UI.

## Skills Required
- `react` — extend the `useConfig` resource hook and add a write helper.
- `typescript` — model the updated `ConfigFile`/`Config` types accurately.

## Acceptance Criteria
- [ ] The client `ConfigFile` type in `src/web/data/api.ts` declares `relPath: string` and `description?: string`; the stale unused optional fields (`kind`, `when`, `purpose`, `customized`, `empty`, `frontmatter`, `sections`) are removed since the redesign no longer uses them.
- [ ] `useConfig()` merges `description` onto each hook/template from the Task 1 registry by `id`, in exactly one place (no component re-implements the lookup).
- [ ] A `saveConfigFile(kind, id, content)` function issues `PUT /api/config/:kind/:id` with a JSON body `{ content }`, and resolves/rejects with a typed success or error result.
- [ ] Type-check (`tsc`) and lint pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Keep the fetch-only data-layer convention (`loading | error | data` resource); do not introduce a state library.
- The description merge must read the registry accessor from Task 1 (`descriptionFor`), not duplicate the data.
- `saveConfigFile` mirrors the existing imperative API calls (e.g. the archive/self-review POST helpers if present) for error handling shape.

## Input Dependencies
- Task 1: the description registry accessor.
- Task 2: the `relPath` field on the server model and the `PUT /api/config/:kind/:id` endpoint contract.

## Output Artifacts
- Updated `src/web/data/api.ts` (`ConfigFile`/`Config` types, `useConfig` merge, `saveConfigFile`).

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. Update the type:
   ```ts
   export interface ConfigFile { id: string; file: string; relPath: string; content: string; description?: string; }
   ```
   Remove the now-dead optional fields and fix any references that read them (the old Hooks/Templates views are removed in Task 4, so coordinate — those reads disappear).
2. Merge descriptions in `useConfig`. If `useConfig` uses a generic `useResource<Config>`, map the resolved data once:
   ```ts
   const withDescriptions = (cfg: Config): Config => ({
     hooks: cfg.hooks.map(h => ({ ...h, description: descriptionFor(h.id) })),
     templates: cfg.templates.map(t => ({ ...t, description: descriptionFor(t.id) })),
   });
   ```
   Apply it where the resource resolves so consumers receive merged data.
3. `saveConfigFile`:
   ```ts
   export async function saveConfigFile(kind: 'hooks' | 'templates', id: string, content: string): Promise<void> {
     const res = await fetch(`/api/config/${kind}/${encodeURIComponent(id)}`, {
       method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
     });
     if (!res.ok) { const msg = await res.json().catch(() => ({})); throw new Error((msg as {error?: string}).error ?? `Save failed (${res.status})`); }
   }
   ```
4. Run `npx tsc -p tsconfig.json --noEmit` and `npx eslint src/web/data/api.ts`.
</details>
