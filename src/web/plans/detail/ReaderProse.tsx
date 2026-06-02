/**
 * Sanitized markdown prose renderer for a plan's `plan.md` — the right column of
 * the Plan Detail Reader.
 *
 * Ported from the design's `screens-detail.jsx` (`PlanDetailReader`, the
 * `.reader` block) and styled with Tailwind utilities (Plan 102): the reader
 * shell/meta constants live alongside the markdown `PROSE_CONTAINER`, and the
 * Success-Criteria `.crit` rows are utility-classed directly in `Section`. It
 * binds ENTIRELY to the plan payload from `GET /api/plans/:id`.
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
 * The execution-summary callout renders only when structured execution-summary
 * metadata is supplied; the live model exposes none today, so
 * it is omitted (graceful degradation, never a fabricated count). An Execution
 * Summary section, if present in the body, still renders as ordinary prose.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { MarkdownSection } from '../../data/api';
import { renderMarkdown } from '../../render/markdown';
import { renderMermaid } from '../../render/mermaid';
import { useTheme } from '../../theme/ThemeProvider';
import { cn } from '../../vendor/utils/cn';
import { MermaidError } from './MermaidError';

/**
 * The prose container classes for rendered markdown — Tailwind Typography plus
 * the two markdown-injected rules `renderMarkdown` emits that Typography cannot
 * reach. `prose dark:prose-invert` carries the editorial heading/paragraph scale
 * (theme-aware via the `.dark` class on <html>); `max-w-none` lets the column
 * width be governed by the reader grid rather than Typography's `65ch` cap.
 *
 * `renderMarkdown` injects `li.md-task` / `li.md-task--done` onto GFM task-list
 * items (a checklist without a checkbox — a read-only input would falsely imply
 * a toggle). Because that markup lives INSIDE the `dangerouslySetInnerHTML`
 * subtree, Tailwind's class scanner never sees it, so the treatment is attached
 * here as arbitrary-variant utilities on the container: an open task is a
 * marker-less row with a leading en-dash, a done task is struck through and
 * muted. This reproduces prose.css's `.prose li.md-task*` rules so they survive
 * that file's deletion (Plan 102, task 7).
 */
const PROSE_CONTAINER = cn(
  'prose dark:prose-invert max-w-none',
  // Editorial scale tweaks: dalia links + display headings, faithful-not-exact.
  'prose-headings:font-display prose-a:text-dalia-dark prose-a:font-medium prose-code:font-mono',
  // The two markdown-injected task-list rules (prose.css lines ~74–80).
  "[&_li.md-task]:list-none [&_li.md-task]:ml-[-1.25rem] [&_li.md-task]:before:content-['–'] [&_li.md-task]:before:mr-2 [&_li.md-task]:before:text-ink-3",
  '[&_li.md-task--done]:line-through [&_li.md-task--done]:text-ink-3'
);

/**
 * The reader column shell. The Plan tab's Reader, the Results tab, and the Task
 * Detail body all share this padded outer wrapper; `READER_INNER` centers the
 * content stack at a legible prose width (reproducing detail.css's `.reader` +
 * `.reader > *` centering once that file is deleted in task 7). Exported so the
 * sibling reader-style screens compose the same vocabulary.
 */
export const READER = 'flex-1 overflow-hidden px-6 py-7 lg:px-10';
export const READER_INNER = 'mx-auto max-w-6xl';

/** The reader meta line: filename · id · date · phase/task counts. */
export const READER_META =
  'mb-6 flex flex-wrap items-baseline gap-x-3.5 gap-y-1 font-mono text-sm text-ink-3 [&>*]:whitespace-nowrap';

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
  return (
    <div className={PROSE_CONTAINER} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
  );
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
    <div
      data-testid="reader-mermaid"
      className="my-3.5 overflow-hidden rounded-card border border-border bg-cream-mid"
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-border-soft px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-3">
        <span>mermaid</span>
        <span className="normal-case tracking-normal italic">Graph tab</span>
      </div>
      {error ? (
        <MermaidError message={error} />
      ) : svg == null ? (
        <div className="px-3.5 py-4 font-sans text-sm text-ink-3">rendering mermaid…</div>
      ) : (
        <div
          className="mermaid-host flex h-auto w-full items-center justify-center px-3.5 py-4 [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <details className="border-t border-border-soft">
        <summary className="cursor-pointer px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-3">
          source
        </summary>
        <pre
          data-testid="reader-mermaid-src"
          className="m-0 overflow-x-auto whitespace-pre px-3.5 py-3 font-mono text-sm leading-normal text-ink-2"
        >
          {src}
        </pre>
      </details>
    </div>
  );
}

/** Renders one `##` section: heading + the appropriate body treatment. */
export function Section({ section }: { section: MarkdownSection }) {
  // A section with no heading (e.g. the Implementation Notes tab, where the tab
  // label replaces the `## Implementation Notes` heading) renders body-only.
  const heading = section.heading.trim() ? (
    <h3
      data-testid="reader-heading"
      className="mb-3 mt-8 font-display text-3xl font-bold leading-tight text-ink"
    >
      <span data-testid="reader-hash" className="mr-1.5 font-mono text-xl font-medium text-dalia">
        ##
      </span>
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
          <div className="mt-2 flex flex-col gap-1">
            {criteria.map((text, i) => (
              <div
                key={i}
                data-testid="crit-row"
                className="flex items-center gap-2 py-1 text-base text-ink-3"
              >
                <span
                  className="w-4 shrink-0 text-center leading-snug text-ink-3"
                  aria-hidden="true"
                >
                  –
                </span>
                <span className="leading-snug">{text}</span>
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
    <div className={READER} data-testid="reader">
      <div className={READER_INNER}>
        <div className={READER_META} data-testid="reader-meta">
          <span className="font-mono text-sm text-ink-2">{filename}</span>
          <span>·</span>
          <span>
            id · <strong className="text-ink-2">{id}</strong>
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
          <div className="my-3.5 rounded-card border-l-4 border-l-dalia-dark bg-dalia-bg px-4 py-3.5">
            <div className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-dalia-deep">
              ✓ Execution summary
              {executionSummary.completedAt ? ` · completed ${executionSummary.completedAt}` : ''}
            </div>
            <div className="text-base leading-relaxed text-ink">{executionSummary.text}</div>
          </div>
        )}

        {sections.map((section, i) => (
          <Section key={i} section={section} />
        ))}
      </div>
    </div>
  );
}
