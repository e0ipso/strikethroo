/**
 * Plan Detail — Graph body (the `/plans/:id` Graph tab content).
 *
 * Renders the plan's embedded mermaid diagram with a Rendered/Source toggle, an
 * embedding-context strip, and a legend, ported from the design's
 * `PlanDetailGraph` / `MermaidBlock` (`scratch/ui/designs/screens-detail.jsx`).
 * Mounted by `PlanDetailRoute`, which owns the shared `Chrome`; this component
 * renders only the strip + canvas/source + legend, reusing the vendored
 * `.graph2*` and `.mermaid-*` classes (Plan 88, Task 001).
 *
 * Rendering goes EXCLUSIVELY through the shared `renderMermaid` boundary
 * (`src/web/render/mermaid.ts`), which loads mermaid via a lazy dynamic
 * `import()` (so mermaid stays out of the initial bundle and is fetched as its
 * own chunk only when this tab is opened) and configures it with mermaid's
 * sanitized `strict` security level — the design's `securityLevel: 'loose'` is
 * deliberately NOT adopted. No second renderer and no raw-markdown re-parsing.
 *
 * Honesty / robustness:
 *   - The mermaid source comes from the Plan 83 model (`detail.mermaid`), which
 *     extracts fenced ```mermaid blocks from the plan body; the Architectural
 *     Approach block is preferred. The model carries no embedding line number,
 *     so the strip omits a fabricated `· line 47`-style value.
 *   - A render failure surfaces as an inline `.mermaid-err` state and never
 *     unmounts the route.
 *   - An absent mermaid block shows an explicit "no diagram" empty state, not an
 *     error.
 */

import { useEffect, useMemo, useState } from 'react';
import type { PlanDetail, MermaidBlock as MermaidModel } from '../../data/api';
import { renderMermaid } from '../../render/mermaid';
import { useTheme } from '../../theme/ThemeProvider';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/**
 * Picks the diagram to display: the Architectural Approach block when present,
 * otherwise the first extracted block. Returns `null` when the plan has none.
 */
function pickDiagram(blocks: MermaidModel[]): MermaidModel | null {
  if (blocks.length === 0) return null;
  return blocks.find(b => b.isArchitecturalApproach) ?? blocks[0];
}

/**
 * Renders a mermaid source string to SVG through the shared lazy boundary.
 * Holds its own loading / error / svg state so a malformed diagram degrades to
 * an inline `.mermaid-err` notice instead of crashing the route.
 */
function MermaidCanvas({ source }: { source: string }) {
  const { resolved } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    renderMermaid(source, resolved)
      .then(out => {
        if (!cancelled) setSvg(out);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [source, resolved]);

  if (error) return <div className="mermaid-err">mermaid error · {error}</div>;
  if (svg == null) return <div className="mermaid-loading">rendering mermaid…</div>;
  return <div className="mermaid-host" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** The diagram legend describing the node kinds in the architectural diagrams. */
function GraphLegend() {
  return (
    <div className="graph2__legend">
      <span className="graph2__legend-item">
        <span className="graph2__legend-swatch graph2__legend-swatch--bug" />
        input from source doc
      </span>
      <span className="graph2__legend-item">
        <span className="graph2__legend-swatch graph2__legend-swatch--task" />
        generated task
      </span>
      <span className="graph2__legend-spacer" />
      <span className="graph2__legend-foot">node kinds as authored in the plan diagram</span>
    </div>
  );
}

/** The Graph body: embedding strip + rendered/source canvas + legend. */
export function PlanDetailGraph({ detail }: { detail: PlanDetail }) {
  const diagram = useMemo(() => pickDiagram(detail.mermaid), [detail.mermaid]);
  const [view, setView] = useState<'rendered' | 'source'>('rendered');

  const filename = basename(detail.file);

  // No mermaid block in the plan → explicit empty state, not an error.
  if (!diagram) {
    return (
      <>
        <div className="graph2__strip">
          <div className="graph2__strip-left">
            <span className="label">Embedded in</span>
            <span className="chip">{filename}</span>
          </div>
        </div>
        <div className="graph2">
          <div className="graph2__canvas">
            <div className="mermaid-loading">no diagram · this plan embeds no mermaid block</div>
          </div>
        </div>
      </>
    );
  }

  const source = diagram.source.trim();

  return (
    <>
      <div className="graph2__strip">
        <div className="graph2__strip-left">
          <span className="label">Embedded in</span>
          <span className="chip">{filename}</span>
          {diagram.isArchitecturalApproach && (
            <span className="graph2__strip-meta">## Architectural Approach</span>
          )}
        </div>
        <div className="graph2__toggle">
          <div
            className={`graph2__toggle-btn${view === 'rendered' ? ' graph2__toggle-btn--active' : ''}`}
            onClick={() => setView('rendered')}
          >
            Rendered
          </div>
          <div
            className={`graph2__toggle-btn${view === 'source' ? ' graph2__toggle-btn--active' : ''}`}
            onClick={() => setView('source')}
          >
            Source
          </div>
        </div>
      </div>

      <div className="graph2">
        {view === 'rendered' ? (
          <div className="graph2__canvas">
            <MermaidCanvas source={source} />
          </div>
        ) : (
          <pre className="graph2__source">{source}</pre>
        )}
        <GraphLegend />
      </div>
    </>
  );
}
