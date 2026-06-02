---
id: 4
group: "web-ui"
dependencies: [3]
status: "completed"
created: 2026-06-02
skills:
  - react-components
  - css
---
# Card-grid listing redesign (shared by Hooks + Templates tabs)

## Objective
Replace both Customize tab bodies with a single uniform, responsive card grid
(3→2→1 columns by viewport, plain CSS Grid). Each card shows the file path
relative to `.ai/strikethroo/` as an eyebrow, the file id as the title, the
registry description (when present), and navigates to the detail route on click.

## Skills Required
- `react-components` — build the shared CardGrid/Card and rewire `CustomizeRoute`/`CustomizeChrome`.
- `css` — responsive CSS Grid in the vendored Dalia stylesheet.

## Acceptance Criteria
- [ ] A shared card-grid view renders the same component for both the Hooks and Templates tabs (driven by the fetched collection), replacing the divergent `HooksView`/`TemplatesView` designs.
- [ ] The grid uses plain CSS Grid that flows 3 columns and collapses to 2 then 1 as the viewport narrows (added to a vendored stylesheet under `src/web/vendor/styles/`, wired through `index.css`).
- [ ] Each card shows: eyebrow = `relPath` prefixed/relative to `.ai/strikethroo/`; title = the file `id` (underscores shown literally, e.g. `POST_PLAN`, `PLAN_TEMPLATE`); description = `description` when present, omitted cleanly when absent.
- [ ] The whole card is the click target and navigates to `/customize/<kind>/<id>` via the shared navigate helper; `kind` is `hooks` or `templates` per the active tab.
- [ ] The old inline content reveal, intelligence/control grouping, frontmatter/section breakdown, and inert action buttons (`Open in editor`, `Customization guide`, `View content`, `Edit`) are removed.
- [ ] The two tabs, the `useConfig` container, and loading/error handling are preserved.
- [ ] Type-check, lint, and `npm run build:web` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Keep the `CustomizeRoute` container, `CustomizeChrome` (minus the inert right-side actions), and the `'hooks' | 'templates'` tab state.
- Use the existing `Chrome`/primitives and class-name-driven vendored styling; the React components stay thin wrappers emitting canonical class names.
- A file lacking nothing special is still clickable; the URL contract is fixed (`/customize/:kind/:id`) so this can be built before/independently of the detail route (Task 5).

## Input Dependencies
- Task 3: `useConfig` now provides `relPath` and `description` on each `ConfigFile`.

## Output Artifacts
- A shared card-grid component (e.g. `src/web/customize/ConfigCardGrid.tsx`).
- Rewritten `src/web/customize/CustomizeRoute.tsx`; `HooksView.tsx`/`TemplatesView.tsx` removed (or collapsed to the shared view).
- Updated `src/web/customize/CustomizeChrome.tsx` (inert actions dropped).
- New vendored stylesheet for the grid, imported via `src/web/vendor/styles/index.css`.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. Card grid CSS — responsive without breakpoints:
   ```css
   .cz__grid { display: grid; gap: 14px; grid-template-columns: repeat(3, 1fr); }
   @media (max-width: 1100px) { .cz__grid { grid-template-columns: repeat(2, 1fr); } }
   @media (max-width: 720px)  { .cz__grid { grid-template-columns: 1fr; } }
   ```
   (Or `repeat(auto-fit, minmax(280px, 1fr))` for a fluid 3→2→1 without media queries — either satisfies the criterion.)
2. Card structure:
   ```tsx
   <button className="cz__card" onClick={() => navigate(`/customize/${kind}/${file.id}`)}>
     <span className="cz__card-eyebrow mono">.ai/strikethroo/{file.relPath}</span>
     <span className="cz__card-title">{file.id}</span>
     {file.description && <p className="cz__card-desc">{file.description}</p>}
   </button>
   ```
   Use a real button or a div with role/keyboard handling for accessibility; match how Archive/Plans rows handle click navigation (`useNavigate`).
3. `relPath` already is `config/hooks/POST_PLAN.md`; render the eyebrow as `.ai/strikethroo/${relPath}` so the full relative path reads naturally. If `relPath` includes more than `config/...`, adjust the prefix so it isn't doubled.
4. Reuse `taskNav.ts`-style shared navigation if a helper pattern exists; otherwise plain `useNavigate`.
5. Delete `HooksView.tsx` and `TemplatesView.tsx` and remove their imports; ensure no remaining references to the removed `ConfigFile` optional fields (coordinate with Task 3).
6. Verify with `npm run build:web` and a quick visual check.
</details>
