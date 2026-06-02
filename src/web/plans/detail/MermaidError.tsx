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
    <div
      data-testid="mermaid-error"
      className="flex flex-col items-center gap-2 p-7 text-center font-sans text-sm text-ink-3"
    >
      <Frown className="text-danger opacity-90" size={30} strokeWidth={1.6} aria-hidden="true" />
      <div className="font-semibold text-ink-2">Couldn&rsquo;t draw this diagram</div>
      <details className="mt-1 w-full max-w-xl">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-ink-3 hover:text-ink-2">
          Details
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-border-soft bg-cream-mid px-3 py-2 text-left font-mono text-xs leading-normal text-ink-2">
          {message}
        </pre>
      </details>
    </div>
  );
}
