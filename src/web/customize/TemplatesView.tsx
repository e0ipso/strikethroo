/**
 * Templates view (Plan 91, Task 004).
 *
 * Reproduces the design's `CustomizeTemplatesView`
 * (scratch/ui/designs/screens-customize.jsx) against LIVE `/api/config` data,
 * with the plan's binding corrections:
 *
 *   - Data comes from the fetched `templates` collection, never the design's
 *     static `TEMPLATES` array.
 *   - `purpose`, `frontmatter`, and `sections` are optional. The purpose
 *     paragraph, the frontmatter chip row, and the ordered section list each
 *     render ONLY when the API surfaces the corresponding field — the current
 *     server model exposes only id/file/content, so the cards degrade to
 *     identifier + file name + inert action + read-only content. No fabricated
 *     frontmatter/sections.
 *   - The design's "Edit" button is an inert presentational ghost action; the
 *     product is read-only (PRD Decision #3) — no Save/Edit/Revert.
 *   - Selecting a template reveals its raw markdown `content` rendered read-only
 *     through the SPA's single sanitized markdown boundary (Plan 87
 *     `renderMarkdown`). No second markdown/sanitizer dependency.
 *
 * All visible workspace paths use `.ai/strikethroo/` naming; the literal
 * `task-manager` never appears.
 */

import { useState } from 'react';
import type { ConfigFile } from '../data/api';
import { renderMarkdown } from '../render/markdown';
import { Button } from '../components/primitives';

export interface TemplatesViewProps {
  templates: ConfigFile[];
}

/** The current workspace templates path — strikethroo naming. */
const TEMPLATES_PATH = '.ai/strikethroo/config/templates/';

/** A read-only markdown block via the SPA's single sanitized markdown path. */
function Markdown({ source }: { source: string }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

/** A single template card with a read-only content reveal. */
function TemplateCard({
  tpl,
  open,
  onToggle,
}: {
  tpl: ConfigFile;
  open: boolean;
  onToggle: () => void;
}) {
  const frontmatter = tpl.frontmatter ?? [];
  const sections = tpl.sections ?? [];
  return (
    <div className="cz__tpl">
      <div className="cz__tpl-head">
        <div>
          <div className="cz__tpl-id mono">{tpl.id}</div>
          <div className="cz__tpl-file mono">{tpl.file}</div>
        </div>
        {/* Inert presentational action — replaces the design's "Edit" button. */}
        <Button kind="ghost" size="sm" onClick={onToggle}>
          {open ? 'Hide content' : 'View content'}
        </Button>
      </div>

      {tpl.purpose && <p className="cz__tpl-purpose">{tpl.purpose}</p>}

      {frontmatter.length > 0 && (
        <div className="cz__tpl-fm">
          <div className="label" style={{ marginBottom: 6 }}>
            Frontmatter
          </div>
          <div className="cz__tpl-fm-list">
            {frontmatter.map(f => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className="cz__tpl-sections">
          <div className="label" style={{ marginBottom: 6 }}>
            Sections
          </div>
          <ol className="cz__tpl-section-list">
            {sections.map((s, i) => (
              <li key={s}>
                <span className="cz__tpl-section-num mono">{String(i + 1).padStart(2, '0')}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {open && <Markdown source={tpl.content} />}
    </div>
  );
}

/** The Templates view: path strip + card grid + read-only content reveal. */
export function TemplatesView({ templates }: TemplatesViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <>
      <div className="cz__path-strip">
        <span className="label">Path</span>
        <span className="chip">{TEMPLATES_PATH}</span>
        <span className="cz__path-meta">
          structure the LLM follows when writing plans, tasks and blueprints
        </span>
      </div>

      <div className="cz__scroll">
        <div className="cz__tpls">
          {templates.map(t => (
            <TemplateCard key={t.id} tpl={t} open={openId === t.id} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      </div>

      <div className="statusbar">
        <span>add project-specific sections to any template — the LLM picks them up next run</span>
        <span>
          <strong>Customization guide ↗</strong>
        </span>
      </div>
    </>
  );
}
