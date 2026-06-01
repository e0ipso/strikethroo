/**
 * Graceful-degradation surface for a mermaid diagram that fails to render.
 *
 * Both mermaid consumers — the Graph tab's `MermaidCanvas`
 * (`PlanDetailGraph.tsx`) and the Reader's `MermaidDiagram` (`ReaderProse.tsx`)
 * — render this instead of mermaid's own red "Syntax error" graphic when
 * `renderMermaid` rejects: a friendly Lucide glyph, a short human line, and a
 * collapsed `<details>` "Details" disclosure holding the raw parser error for
 * whoever needs to debug the source.
 *
 * Suppressing mermaid's built-in error graphic happens at the render boundary
 * (`suppressErrorRendering` in `render/mermaid.ts`); this component only
 * presents the failure. It never parses or sanitizes anything — `message` is
 * mermaid's own error text, rendered as inert `<pre>` text.
 */

import { Frown } from 'lucide-react';

export interface MermaidErrorProps {
  /** The raw error message from a rejected `renderMermaid` call. */
  message: string;
}

/** Friendly glyph + short line + collapsible raw-error disclosure. */
export function MermaidError({ message }: MermaidErrorProps) {
  return (
    <div className="mermaid-err">
      <Frown className="mermaid-err__glyph" size={30} strokeWidth={1.6} aria-hidden="true" />
      <div className="mermaid-err__title">Couldn&rsquo;t draw this diagram</div>
      <details className="mermaid-err__details">
        <summary>Details</summary>
        <pre className="mermaid-err__trace">{message}</pre>
      </details>
    </div>
  );
}
