---
id: 5
group: "web-ui"
dependencies: [3]
status: "completed"
created: 2026-06-02
skills:
  - react-components
  - codemirror
---
# Editor detail page (CodeMirror 6 + Save) and detail route

## Objective
Add a deep-linkable Customize detail route (`/customize/:kind/:id`) that renders
the selected hook/template in a theme-aware CodeMirror 6 markdown editor with a
working Save button that persists changes via `saveConfigFile`. The editor is
lazy-loaded (code-split) and carries no WYSIWYG toolbar.

## Skills Required
- `react-components` — the detail route component, router/App wiring, state surfaces.
- `codemirror` — integrate CodeMirror 6 with markdown highlighting, theming, and lazy loading.

## Acceptance Criteria
- [ ] `router.tsx` resolves a new `customizeDetail` section from `/customize/:kind/:id` (kind ∈ `hooks`|`templates`), added to `RouteSection`, `Route.params`, and `parsePath`, with the existing fallback semantics; `App.tsx` routes it to the detail screen.
- [ ] The detail screen locates the file from the already-fetched `useConfig()` data by `kind` + `id` (no new per-file GET) and mounts a CodeMirror 6 editor (`@uiw/react-codemirror` + `@codemirror/lang-markdown`) seeded with the file content.
- [ ] The editor shows markdown syntax highlighting, no WYSIWYG buttons, and follows the app theme (consumes `useTheme().resolved`, switching the CodeMirror theme on change like the mermaid renderers).
- [ ] CodeMirror is reached via a lazy dynamic `import()` so it is code-split out of the listing bundle.
- [ ] A Save button is enabled only when content differs from the loaded baseline; clicking it calls `saveConfigFile`, shows success and error feedback, and resets the baseline to the saved content on success.
- [ ] Loading, error, and not-found (unknown kind/id) states each render a designed surface consistent with the Plan/Task detail routes, including a path/title header and a way back to the listing.
- [ ] CodeMirror and `@codemirror/*` are added to `package.json` **devDependencies** only; `npm pack --dry-run` shows no new runtime dependency. Type-check, lint, and `npm run build:web` pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- The CodeMirror editor is a NEW rendering boundary distinct from `renderMarkdown` — it is an editor, not sanitized-HTML output, so it does not pass through the DOMPurify boundary and does not violate the single-markdown-boundary rule. No rendered markdown preview is included (out of scope).
- Reuse the shared state surfaces (`LoadingSurface`/`ErrorSurface`) and the `Chrome`/breadcrumb contract for the header.
- The route contract `/customize/:kind/:id` must match the listing's navigation target from Task 4.

## Input Dependencies
- Task 3: `useConfig()` provides the file list (with content) and `saveConfigFile`.

## Output Artifacts
- New `src/web/customize/CustomizeDetailRoute.tsx` (or similar) and a lazy CodeMirror wrapper.
- Updated `src/web/router.tsx` and `src/web/App.tsx`.
- `package.json` devDependencies for CodeMirror.

## Implementation Notes
<details>
<summary>Detailed guidance</summary>

1. Deps: `npm i -D @uiw/react-codemirror @codemirror/lang-markdown` (these pull `@codemirror/*` cores). Confirm they land in devDependencies.
2. Router: extend `RouteSection` with `'customizeDetail'`; in `parsePath` add a regex `^/customize/([^/]+)/([^/]+)/?$` capturing `kind` and `id`, returning `{ section: 'customizeDetail', params: { id, kind } }` (add `kind` to the `Route.params` type). Place it before the bare `/customize` match. `App.tsx` renders the detail route for that section.
3. Lazy CodeMirror wrapper to keep it code-split:
   ```tsx
   const CodeMirror = lazy(() => import('@uiw/react-codemirror').then(m => ({ default: m.default })));
   // render inside <Suspense fallback={<LoadingSurface .../>}>
   ```
   Load `markdown()` from `@codemirror/lang-markdown` and pass as an extension. For dark mode, pass a theme prop/extension derived from `useTheme().resolved` (e.g. the bundled `oneDark` for dark, default for light) and key the editor (or pass `theme`) so it re-applies on change.
4. Locate the file: `const cfg = useConfig(); const list = kind === 'hooks' ? cfg.data.hooks : cfg.data.templates; const file = list.find(f => f.id === id);` Handle `loading`/`error`/`!file` (not-found) explicitly.
5. Editor state: `const [value, setValue] = useState(file.content); const dirty = value !== file.content;` (re-seed when `file.content` changes after a save/refresh). Save: `await saveConfigFile(kind, id, value)` then update baseline; show inline status (saving/saved/error). Disable Save when `!dirty` or while saving.
6. Header: breadcrumb `workspace / config / <kind> / <id>` (last crumb inert), with the relative path shown; provide a back link to `/customize`.
7. Verify: `npm run build:web` then load `/customize/hooks/POST_PLAN`, edit, save; confirm code-splitting (CodeMirror not in the main/listing chunk).
</details>
