---
id: 1
group: "data-registry"
dependencies: []
status: "completed"
created: 2026-06-02
skills:
  - vite
  - data-modeling
---
# Description Registry (data YAML) with build-time import

## Objective
Create a human-editable YAML registry that maps a config filename (hook or
template, e.g. `POST_PLAN.md`, `PLAN_TEMPLATE.md`) to a short description
string, make it importable by the SPA at build time (no new runtime
dependency), and populate it now for every hook and template currently shipped
in the workspace.

## Skills Required
- `vite` — wire a build-time YAML import into the existing Vite SPA build.
- `data-modeling` — design the filename→description map and author accurate
  descriptions from the project docs.

## Acceptance Criteria
- [ ] A YAML file exists under `src/web/` (e.g. `src/web/customize/descriptions.yaml`) mapping config filenames to descriptions.
- [ ] The YAML is importable from SPA TypeScript as a typed object (build-time only); no new entry is added to `package.json` runtime `dependencies`.
- [ ] Every hook currently under `.ai/strikethroo/config/hooks/` and every template under `.ai/strikethroo/config/templates/` has an accurate, one-to-two sentence description sourced from the project documentation.
- [ ] A file with no entry resolves to "no description" cleanly (the lookup returns `undefined`, never throws).
- [ ] `npm run build:web` succeeds with the YAML import in place.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Vite YAML import: add a build-time **devDependency** (e.g. `@modyfi/vite-plugin-yaml` or equivalent) and register it in `vite.config.mts`. Alternatively, keep the canonical YAML and generate a committed JSON sibling imported natively — pick the lower-friction option, but the authored source must be YAML.
- The keys are the **filenames including `.md`** (the model `id` is the basename without `.md`; the consumer in Task 3 will key by `id`, so either store keys as `id` without extension or document the transform — be consistent and document which).
- Provide a tiny typed accessor (e.g. `descriptionFor(id: string): string | undefined`) or export the typed map so exactly one consumer (Task 3) reads it.

## Input Dependencies
None.

## Output Artifacts
- `src/web/customize/descriptions.yaml` (or `.yaml` + generated `.json`).
- A typed export/accessor for the registry.
- `vite.config.mts` updated (if a plugin is used) and `package.json` devDependency added.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. Enumerate the current files to describe:
   - Hooks: run `ls .ai/strikethroo/config/hooks/` (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_TASK_GENERATION_ALL, POST_EXECUTION, POST_ERROR_DETECTION — confirm the actual set).
   - Templates: run `ls .ai/strikethroo/config/templates/` (PLAN_TEMPLATE, TASK_TEMPLATE, BLUEPRINT_TEMPLATE, EXECUTION_SUMMARY_TEMPLATE — confirm the actual set).
2. Author descriptions from authoritative sources: the root `AGENTS.md` (lifecycle hooks list and template descriptions), `.ai/knowledge-base/INDEX.md`, and the hook/template file contents themselves. Keep each to 1–2 sentences describing what the file is for.
3. YAML shape (keys without extension, matching the model `id`):
   ```yaml
   PRE_PLAN: "Scope-control and simplicity guidance the assistant applies before drafting a plan."
   POST_PLAN: "Post-plan checks ensuring the plan has a Self Validation section and a documentation-impact answer."
   PLAN_TEMPLATE: "The structure every generated plan document conforms to."
   # ...
   ```
4. Vite plugin route: `npm i -D @modyfi/vite-plugin-yaml`, add to `vite.config.mts` plugins, then `import descriptions from './customize/descriptions.yaml'`. Confirm the import type resolves (add an ambient `*.yaml` module declaration if TypeScript complains).
5. Accessor:
   ```ts
   import descriptions from './descriptions.yaml';
   export const descriptionFor = (id: string): string | undefined =>
     (descriptions as Record<string, string>)[id];
   ```
6. Verify no runtime dependency was added: `npm pack --dry-run` (the plugin and any YAML lib must be devDependencies).
</details>
