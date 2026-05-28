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

/** Module-scoped promise so mermaid is configured/loaded at most once. */
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

/**
 * Loads (lazily, once) and initializes the mermaid renderer. The first call
 * triggers the dynamic import; subsequent calls reuse the resolved instance.
 */
async function loadMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(mod => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        // Matches the design's Graph view configuration.
        securityLevel: 'loose',
        flowchart: { htmlLabels: true, curve: 'basis' },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * Renders a mermaid diagram source string to an SVG markup string.
 *
 * The mermaid renderer is loaded on first use via dynamic import, so callers
 * that never invoke this function (the Reader) never load mermaid. The `id`
 * disambiguates concurrent renders; a unique value is generated when omitted.
 */
export async function renderMermaid(source: string, id?: string): Promise<string> {
  const mermaid = await loadMermaid();
  const renderId = id ?? `mmd-${Math.random().toString(36).slice(2, 9)}`;
  const { svg } = await mermaid.render(renderId, source);
  return svg;
}
