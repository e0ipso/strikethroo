/**
 * Plan Detail — Graph body (the `/plans/:id` Graph tab content).
 *
 * Renders the plan's embedded mermaid diagram with a Rendered/Source toggle, an
 * embedding-context strip, and a legend, ported from the design's
 * `PlanDetailGraph` / `MermaidBlock` (`scratch/ui/designs/screens-detail.jsx`).
 * Mounted by `PlanDetailRoute`, which owns the shared `Chrome`; this component
 * renders only the strip + canvas/source + legend with Tailwind utilities. The
 * rendered SVG sits in a `.mermaid-host` container whose SVG-internal labels are
 * styled by the scoped `mermaid.css` block (Plan 102).
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

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlanDetail, MermaidBlock as MermaidModel } from '../../data/api';
import { renderMermaid } from '../../render/mermaid';
import { useTheme } from '../../theme/ThemeProvider';
import { Chip } from '../../components/primitives';
import { cn } from '../../vendor/utils/cn';
import { MermaidError } from './MermaidError';

/** Basename of an absolute or relative path. */
const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath;

/** Shared eyebrow label (the design's `.label` from base.css). */
const LABEL = 'font-sans text-base font-semibold uppercase tracking-widest text-dalia-dark';

/** The graph container — fills the body behind the canvas. */
const GRAPH_CONTAINER = 'flex min-h-0 flex-1 flex-col overflow-hidden bg-cream px-7 pb-3.5 pt-5';

/** The bordered canvas the rendered SVG centers in. */
const GRAPH_CANVAS =
  'flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-card border border-border-soft bg-cream px-6 py-5';

/** The embedding strip above the canvas: "Embedded in <file>" + optional toggle. */
function GraphStrip({
  filename,
  architectural,
  children,
}: {
  filename: string;
  architectural?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft bg-cream px-7 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className={LABEL}>Embedded in</span>
        <Chip>{filename}</Chip>
        {architectural && (
          <span className="text-sm italic text-ink-3">## Architectural Approach</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** One Rendered/Source segmented toggle button. */
function GraphToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded px-3 py-1 text-sm font-medium text-ink-3',
        active &&
          'bg-cream font-semibold text-ink shadow-sm ring-1 ring-border-soft dark:bg-cream-mid'
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

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

  if (error) return <MermaidError message={error} />;
  if (svg == null)
    return <div className="p-7 font-sans text-sm text-ink-3">rendering mermaid…</div>;
  return (
    <div
      className="mermaid-host flex h-full w-full items-center justify-center [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** The diagram legend describing the node kinds in the architectural diagrams. */
function GraphLegend() {
  return (
    <div
      data-testid="graph-legend"
      className="mt-3 flex items-center gap-4 border-t border-border-soft pt-2.5 font-sans text-sm text-ink-3"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm border border-dashed border-ink-3 bg-cream-mid dark:bg-transparent" />
        input from source doc
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm bg-done-bg ring-1 ring-inset ring-done" />
        generated task
      </span>
      <span className="flex-1" />
      <span className="text-xs text-ink-3">node kinds as authored in the plan diagram</span>
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
        <GraphStrip filename={filename} />
        <div className={GRAPH_CONTAINER} data-testid="graph">
          <div className={GRAPH_CANVAS} data-testid="graph-canvas">
            <div className="p-7 font-sans text-sm text-ink-3">
              no diagram · this plan embeds no mermaid block
            </div>
          </div>
        </div>
      </>
    );
  }

  const source = diagram.source.trim();

  return (
    <>
      <GraphStrip filename={filename} architectural={diagram.isArchitecturalApproach}>
        <div
          data-testid="graph-toggle"
          className="inline-flex rounded-md bg-cream-mid p-0.5 ring-1 ring-inset ring-border-soft dark:bg-black/25"
        >
          <GraphToggleBtn active={view === 'rendered'} onClick={() => setView('rendered')}>
            Rendered
          </GraphToggleBtn>
          <GraphToggleBtn active={view === 'source'} onClick={() => setView('source')}>
            Source
          </GraphToggleBtn>
        </div>
      </GraphStrip>

      <div className={GRAPH_CONTAINER} data-testid="graph">
        {view === 'rendered' ? (
          <div className={GRAPH_CANVAS} data-testid="graph-canvas">
            <MermaidCanvas source={source} />
          </div>
        ) : (
          <pre
            data-testid="graph-source"
            className="m-0 flex-1 overflow-auto whitespace-pre rounded-card bg-deep px-5 py-5 font-mono text-sm leading-relaxed text-cream"
          >
            {source}
          </pre>
        )}
        <GraphLegend />
      </div>
    </>
  );
}
