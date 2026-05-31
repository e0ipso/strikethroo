/**
 * Plan Detail — Results body (the `/plans/:id` Results tab content).
 *
 * Renders the execution-time tail of the plan body as full-width prose: the
 * "Notes" / "Execution Blueprint" sections and everything after them (to EOF),
 * sliced out of the plan body by `splitResultsSections`. This is the latter half
 * of the plan document moved off the Plan tab; it carries NO Chrome and NO data
 * fetch (the surrounding `PlanDetailRoute` owns those).
 *
 * Each section is rendered through the exact same `Section` renderer the Plan
 * tab's Reader uses, so markdown/sanitization (`renderMarkdown`) and the mermaid
 * source affordance behave identically. This is the markdown *prose* of the
 * blueprint/notes — deliberately distinct from the Tasks tab, which renders the
 * tasks frontmatter (`ExecuteTab`), and from the phases/tasks-driven
 * `BlueprintRail`. They must not be conflated.
 */

import type { PlanDetail } from '../../data/api';
import { splitResultsSections } from '../derive';
import { Section } from './ReaderProse';

/** The Results body: the plan's execution-time tail markdown as full-width prose. */
export function PlanDetailResults({ detail }: { detail: PlanDetail }) {
  const { resultsSections } = splitResultsSections(detail.sections);

  if (resultsSections.length === 0) {
    return (
      <div className="reader">
        <p className="reader__meta">This plan has no Notes or Execution Blueprint section.</p>
      </div>
    );
  }

  return (
    <div className="reader">
      {resultsSections.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </div>
  );
}
