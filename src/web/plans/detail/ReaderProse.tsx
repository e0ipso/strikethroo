/**
 * Sanitized markdown prose renderer for a plan's `plan.md` — the right column of
 * the Plan Detail Reader.
 *
 * Ported from the design's `screens-detail.jsx` (`PlanDetailReader`, the
 * `.reader` block) and styled with the vendored `.reader*` / `.clar*` / `.crit*`
 * classes (src/web/vendor/styles/detail.css). It binds ENTIRELY to the plan
 * payload from `GET /api/plans/:id` — there is no hardcoded plan-38 content.
 *
 * All free-form section bodies are turned into HTML through the SPA's single
 * markdown/sanitization boundary (`renderMarkdown`, src/web/render/markdown.ts);
 * this component never parses or sanitizes markdown itself. Two sections get a
 * bespoke treatment matching the design instead of the generic prose path:
 *
 *  - **Success Criteria** renders as a `.crit` list of plain marker rows. The
 *    model exposes no per-criterion completion (criteria are prose list items,
 *    not tasks), so each criterion renders as a static list row — never as a
 *    checkbox, which would be a read-only input falsely implying a toggle.
 *  - **Inline ` ```mermaid ` fences** render as the actual diagram via the shared
 *    lazy `renderMermaid` boundary (render/mermaid.ts). The mermaid library stays
 *    code-split behind that dynamic `import()`, so it is fetched only when a Plan
 *    tab containing a diagram is first opened — not on every plan load.
 *
 * The `.reader__summary` execution-summary callout renders only when structured
 * execution-summary metadata is supplied; the live model exposes none today, so
 * it is omitted (graceful degradation, never a fabricated count). An Execution
 * Summary section, if present in the body, still renders as ordinary prose.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { MarkdownSection } from '../../data/api';
import { renderMarkdown } from '../../render/markdown';
import { renderMermaid } from '../../render/mermaid';
import { useTheme } from '../../theme/ThemeProvider';
import { MermaidError } from './MermaidError';

export interface ReaderProseProps {
  /** Plan file basename, e.g. `plan-38--fix-jekyll-link-baseurl.md`. */
  filename: string;
  /** Numeric plan id. */
  id: number;
  /** ISO created date, when known. */
  created?: string;
  /** Phase count for the meta line. */
  phaseCount: number;
  /** Task count for the meta line. */
  taskCount: number;
  /** Ordered `##` sections of the plan body. */
  sections: MarkdownSection[];
  /**
   * Optional structured execution-summary metadata. Absent on the live model
   * today; when present, renders the `.reader__summary` callout.
   */
  executionSummary?: { completedAt?: string; text: string };
}

/** Heading match for the Success Criteria section (case-insensitive). */
const SUCCESS_CRITERIA_RE = /success\s+criteria/i;

/** Matches a fenced ```mermaid block, capturing its inner source. */
const MERMAID_FENCE_RE = /```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

/** A safe-HTML block rendered through the single sanitized markdown path. */
function Markdown({ source }: { source: string }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

/**
 * Extracts criterion lines from a Success Criteria section body: top-level
 * bulleted (`- `/`* `) or numbered (`1. `) items, ignoring sub-headings and
 * blank lines. Nested/indented items are flattened to their text.
 */
function extractCriteria(content: string): string[] {
  const criteria: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (m && m[1]) criteria.push(m[1].trim());
  }
  return criteria;
}

/**
 * Splits a section body into ordered segments: free-form markdown runs and the
 * mermaid fences between them, so fences can be rendered as a source affordance
 * while the surrounding prose still goes through the markdown path.
 */
function segmentMermaid(
  content: string
): Array<{ kind: 'md'; text: string } | { kind: 'mermaid'; src: string }> {
  const segments: Array<{ kind: 'md'; text: string } | { kind: 'mermaid'; src: string }> = [];
  let lastIndex = 0;
  MERMAID_FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MERMAID_FENCE_RE.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim().length > 0) segments.push({ kind: 'md', text: before });
    segments.push({ kind: 'mermaid', src: (match[1] ?? '').trim() });
    lastIndex = match.index + match[0].length;
  }
  const tail = content.slice(lastIndex);
  if (tail.trim().length > 0) segments.push({ kind: 'md', text: tail });
  return segments;
}

/**
 * Renders an inline mermaid diagram through the shared lazy `renderMermaid`
 * boundary. Holds its own loading / error / svg state (the render is async) so a
 * malformed diagram degrades to an inline notice instead of crashing the Reader,
 * mirroring the Graph tab's `MermaidCanvas`. The raw source stays available in a
 * `<details>` so the affordance is non-destructive.
 */
function MermaidDiagram({ src }: { src: string }) {
  const { resolved } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    renderMermaid(src, resolved)
      .then(out => {
        if (!cancelled) setSvg(out);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [src, resolved]);

  return (
    <div className="reader__mermaid">
      <div className="reader__mermaid-head">
        <span>mermaid</span>
        <span className="reader__mermaid-hint">Graph tab</span>
      </div>
      {error ? (
        <MermaidError message={error} />
      ) : svg == null ? (
        <div className="mermaid-loading">rendering mermaid…</div>
      ) : (
        <div className="mermaid-host" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <details className="reader__mermaid-details">
        <summary>source</summary>
        <pre className="reader__mermaid-src">{src}</pre>
      </details>
    </div>
  );
}

/** Renders one `##` section: heading + the appropriate body treatment. */
export function Section({ section }: { section: MarkdownSection }) {
  // A section with no heading (e.g. the Implementation Notes tab, where the tab
  // label replaces the `## Implementation Notes` heading) renders body-only.
  const heading = section.heading.trim() ? (
    <h3 className="reader__h2">
      <span className="hash">##</span>
      {section.heading}
    </h3>
  ) : null;

  // Success Criteria -> bespoke .crit checklist (unchecked: no completion data).
  if (SUCCESS_CRITERIA_RE.test(section.heading)) {
    const criteria = extractCriteria(section.content);
    if (criteria.length > 0) {
      return (
        <>
          {heading}
          <div className="crit">
            {criteria.map((text, i) => (
              <div key={i} className="crit__row">
                <span className="crit__marker" aria-hidden="true">
                  –
                </span>
                <span className="crit__text">{text}</span>
              </div>
            ))}
          </div>
        </>
      );
    }
  }

  // Everything else: markdown prose, with mermaid fences rendered inline.
  const segments = segmentMermaid(section.content);
  return (
    <>
      {heading}
      {segments.map(
        (seg, i): ReactNode =>
          seg.kind === 'mermaid' ? (
            <MermaidDiagram key={i} src={seg.src} />
          ) : (
            <Markdown key={i} source={seg.text} />
          )
      )}
    </>
  );
}

/** The Reader prose column: header block + the plan's rendered sections. */
export function ReaderProse({
  filename,
  id,
  created,
  phaseCount,
  taskCount,
  sections,
  executionSummary,
}: ReaderProseProps) {
  return (
    <div className="reader">
      <div className="reader__meta">
        <span className="reader__filename">{filename}</span>
        <span>·</span>
        <span>
          id · <strong style={{ color: 'var(--ink-2)' }}>{id}</strong>
        </span>
        {created && (
          <>
            <span>·</span>
            <span>created · {created}</span>
          </>
        )}
        <span>·</span>
        <span>
          {phaseCount} phases · {taskCount} tasks
        </span>
      </div>

      {executionSummary && (
        <div className="reader__summary">
          <div className="reader__summary-eyebrow">
            ✓ Execution summary
            {executionSummary.completedAt ? ` · completed ${executionSummary.completedAt}` : ''}
          </div>
          <div className="reader__summary-text">{executionSummary.text}</div>
        </div>
      )}

      {sections.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </div>
  );
}
