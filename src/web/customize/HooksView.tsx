/**
 * Hooks view (Plan 91, Task 003).
 *
 * Reproduces the design's `CustomizeHooksView` / `CustomizeHookDetailView`
 * (scratch/ui/designs/screens-customize.jsx) against LIVE `/api/config` data,
 * with the plan's binding corrections:
 *
 *   - Data comes from the fetched `hooks` collection, never the design's static
 *     `HOOKS` array. The path-strip meta count is `hooks.length`, never `9`.
 *   - Hooks are grouped into "LLM intelligence hooks" / "Workflow control hooks"
 *     ONLY when the API surfaces a `kind`. When `kind` is absent (the current
 *     server model exposes only id/file/content), every hook renders in a single
 *     UNGROUPED list — never a hardcoded kind assignment.
 *   - Every metadata field beyond id/file/content is optional and rendered
 *     defensively: no `when` line when `when` is absent, no `purpose` paragraph
 *     when `purpose` is absent, the status tag falls back to `default`.
 *   - The design's "Edit" button is an inert presentational ghost action; there
 *     is no editable line-numbered surface and no Save/Edit/Revert (read-only
 *     product, PRD Decision #3).
 *   - Selecting a hook reveals its raw markdown `content` rendered read-only
 *     through the SPA's single sanitized markdown boundary (Plan 87
 *     `renderMarkdown`). No second markdown/sanitizer dependency is introduced.
 *
 * All visible workspace paths use `.ai/strikethroo/` naming; the literal
 * `task-manager` never appears.
 */

import { useState } from 'react';
import type { ConfigFile } from '../data/api';
import { renderMarkdown } from '../render/markdown';
import { Button } from '../components/primitives';

export interface HooksViewProps {
  hooks: ConfigFile[];
}

/** The current workspace hooks path — strikethroo naming (design's is stale). */
const HOOKS_PATH = '.ai/strikethroo/config/hooks/';

/** Group definitions, keyed by the API `kind`, ported from the design copy. */
const GROUPS: Array<{
  kind: 'intelligence' | 'control';
  title: string;
  sub: string;
  desc: string;
}> = [
  {
    kind: 'intelligence',
    title: 'LLM intelligence hooks',
    sub: 'reasoning · judgment · pattern recognition',
    desc: 'Where the LLM brings its understanding to bear — scope control, complexity analysis, error diagnosis. Edit these to inject project-specific rules the assistant should weigh during planning and execution.',
  },
  {
    kind: 'control',
    title: 'Workflow control hooks',
    sub: 'deterministic actions · LLM as executor',
    desc: 'Branching, committing, status updates. The LLM acts as executor here, not reasoner. Customize to add environment checks or branch-naming rules.',
  },
];

/** A read-only markdown block via the SPA's single sanitized markdown path. */
function Markdown({ source }: { source: string }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

/** The status tag for a hook: customized > ships empty > default. */
function HookTag({ hook }: { hook: ConfigFile }) {
  if (hook.customized) return <span className="cz__tag cz__tag--customized">customized</span>;
  if (hook.empty) return <span className="cz__tag cz__tag--empty">ships empty</span>;
  return <span className="cz__tag">default</span>;
}

/** A single hook card. Selecting it toggles the read-only content reveal. */
function HookCard({
  hook,
  open,
  onToggle,
}: {
  hook: ConfigFile;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`cz__hook${hook.empty ? ' cz__hook--empty' : ''}`}>
      <div className="cz__hook-main">
        <div className="cz__hook-head">
          <span className="cz__hook-id mono">{hook.id}</span>
          <HookTag hook={hook} />
        </div>
        {hook.when && (
          <div className="cz__hook-when">
            <span className="cz__hook-when-label">when</span> {hook.when}
          </div>
        )}
        {hook.purpose && <p className="cz__hook-purpose">{hook.purpose}</p>}
        {open && <Markdown source={hook.content} />}
      </div>
      <div className="cz__hook-side">
        <span className="cz__file mono">{hook.file}</span>
        {/* Inert presentational action — replaces the design's "Edit" button. */}
        <Button kind="ghost" size="sm" onClick={onToggle}>
          {open ? 'Hide content' : 'View content'}
        </Button>
      </div>
    </div>
  );
}

/** Renders a list of hook cards with shared open/close reveal state. */
function HookList({
  hooks,
  openId,
  onToggle,
}: {
  hooks: ConfigFile[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="cz__hooks">
      {hooks.map(h => (
        <HookCard key={h.id} hook={h} open={openId === h.id} onToggle={() => onToggle(h.id)} />
      ))}
    </div>
  );
}

/** The Hooks view: path strip + grouped (or ungrouped) cards + content reveal. */
export function HooksView({ hooks }: HooksViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  // Group only when the API actually surfaces a `kind`; otherwise a single
  // ungrouped list (never a hardcoded kind assignment).
  const hasKind = hooks.some(h => h.kind === 'intelligence' || h.kind === 'control');

  return (
    <>
      <div className="cz__path-strip">
        <span className="label">Path</span>
        <span className="chip">{HOOKS_PATH}</span>
        <span className="cz__path-meta">
          {hooks.length} markdown {hooks.length === 1 ? 'file' : 'files'} · LLM reads each at its
          workflow point
        </span>
      </div>

      <div className="cz__scroll">
        {hasKind ? (
          GROUPS.map(g => {
            const items = hooks.filter(h => h.kind === g.kind);
            if (items.length === 0) return null;
            return (
              <section key={g.kind} className="cz__group">
                <div className="cz__group-head">
                  <div>
                    <div className="label label--dalia">
                      {items.length} · {g.sub}
                    </div>
                    <h2 className="cz__group-title">{g.title}</h2>
                  </div>
                  <p className="cz__group-desc">{g.desc}</p>
                </div>
                <HookList hooks={items} openId={openId} onToggle={toggle} />
              </section>
            );
          })
        ) : (
          <HookList hooks={hooks} openId={openId} onToggle={toggle} />
        )}
      </div>

      <div className="statusbar">
        <span>not for: linting, test execution, coverage gates — those belong in CI</span>
        <span>
          <strong>Customization guide ↗</strong>
        </span>
      </div>
    </>
  );
}
