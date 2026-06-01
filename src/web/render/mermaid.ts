/**
 * Lazy mermaid-rendering path — the other half of the shared rendering boundary.
 *
 * The mermaid library is heavy and is only needed by the Graph view (a later
 * ticket). To keep it off the Reader route's bundle, mermaid is reached
 * EXCLUSIVELY through the dynamic `import()` inside {@link renderMermaid}; this
 * module imports nothing from `mermaid` at the top level. Importing this file
 * (or the markdown path in `./markdown.ts`) therefore does not pull mermaid into
 * the caller's eager dependency graph — the bundler splits it into a chunk that
 * is fetched only when `renderMermaid` is first called.
 *
 * The Graph view consumes this without any change to the Reader: it calls
 * `renderMermaid(source)` and inserts the returned SVG. The Reader never imports
 * this module.
 */

/** The resolved (concrete) color scheme a diagram is rendered for. */
export type MermaidTheme = 'light' | 'dark';

/** Module-scoped promise so the mermaid library is loaded at most once. */
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

/**
 * Theme-specific color variables.
 *
 * Mermaid bakes these colors into the SVG at render time (they are NOT CSS
 * variables that could cascade afterwards), so a dark page needs a dark palette
 * baked in — otherwise the light-mode fills produced by the `base` theme clash
 * with the dark-mode HTML-label text colored via `var(--ink-3)` in
 * `board-graph.css`, leaving light text on light fills. Values are plain hex/hsl
 * because mermaid's color engine (khroma) does not parse `oklch()`; they mirror
 * the design tokens closely enough for accessible contrast.
 *
 * Light mode passes no color overrides so the established `base`-theme
 * appearance is preserved exactly.
 */
const THEME_COLORS: Record<MermaidTheme, Record<string, string>> = {
  light: {},
  dark: {
    background: 'transparent',
    primaryColor: '#241f2e',
    primaryTextColor: '#efe9e0',
    primaryBorderColor: '#544c60',
    secondaryColor: '#1e1926',
    tertiaryColor: '#1e1926',
    lineColor: '#9b93a3',
    textColor: '#efe9e0',
    nodeTextColor: '#efe9e0',
    clusterBkg: '#1b1622',
    clusterBorder: '#3a3342',
    edgeLabelBackground: '#1b1622',
    titleColor: '#efe9e0',
  },
};

/**
 * Loads the mermaid library lazily (once) via dynamic import. Configuration is
 * applied per-render in {@link renderMermaid} rather than here, so a theme
 * switch takes effect on the next render without reloading the library.
 */
async function loadMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(mod => mod.default);
  }
  return mermaidPromise;
}

/**
 * Renders a mermaid diagram source string to an SVG markup string.
 *
 * The mermaid renderer is loaded on first use via dynamic import, so callers
 * that never invoke this function (the Reader) never load mermaid. Mermaid is
 * (re)configured for the requested `theme` before each render, so the baked-in
 * SVG palette matches the active page theme; callers must re-invoke when the
 * theme changes. The `id` disambiguates concurrent renders; a unique value is
 * generated when omitted.
 */
export async function renderMermaid(
  source: string,
  theme: MermaidTheme = 'light',
  id?: string
): Promise<string> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    // Sanitized rendering. The design's Graph view used `securityLevel:
    // 'loose'` (an XSS surface flagged in the PRD); this boundary keeps
    // mermaid's `strict` default so authored diagram labels cannot inject
    // active HTML. Do NOT regress this to 'loose'.
    securityLevel: 'strict',
    // Graceful degradation, NOT a fix for malformed diagrams. Without this,
    // mermaid v11's `render` paints its own red "Syntax error" bomb SVG into a
    // temp element under `<body>` and, on the throw path, never calls
    // `removeTempElements()` (mermaid.core.mjs:1184-1212) — so a stray graphic
    // leaks onto the page that a caller's `catch` cannot undo. With it set,
    // mermaid removes the temp element and simply throws, letting the malformed
    // diagram surface through our own `MermaidError` UI instead. The diagram
    // still genuinely fails; this only stops mermaid drawing over us.
    suppressErrorRendering: true,
    // Compact label typography: shrink the default theme font so diagram
    // labels pack more legibly. Casing is handled by the vendored
    // `.mermaid-host` CSS, not here.
    fontSize: 12,
    themeVariables: { fontSize: '12px', ...THEME_COLORS[theme] },
    flowchart: { htmlLabels: true, curve: 'basis' },
  });
  const renderId = id ?? `mmd-${Math.random().toString(36).slice(2, 9)}`;
  const { svg } = await mermaid.render(renderId, source);
  return svg;
}
