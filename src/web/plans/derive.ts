/**
 * Pure derivation layer for the Plans section (Plan 86, Task 001).
 *
 * Replaces the design's hardcoded `PLANS` array with the live `/api/plans`
 * model and provides every derived value the three views render. The single
 * `mapPlan` adapter is the only place that touches raw API field names, so the
 * views never reach into the API shape directly (mitigates the "API model
 * diverges from the design" risk in the plan). Every helper is pure and
 * individually exported so it is unit-checkable and reusable.
 *
 * Source of truth for the reference logic: `progressDots` / `planMdPath` in
 * `scratch/ui/designs/screens-plans.jsx` — both reimplemented here against the
 * live model and with the stale `.ai/task-manager/` path and em-dash separator
 * corrected to `.ai/strikethroo/` and `--`.
 */

import type { PlanSummary, PlanState, MarkdownSection } from '../data/api';

/** The set of lifecycle states the views know how to render. */
const KNOWN_STATES: readonly PlanState[] = ['drafted', 'ready', 'doing', 'done'];

/**
 * The view-facing shape the List / Cards / Board components consume. Counts are
 * `null` when a plan has no generated tasks (a drafted plan), so views render
 * the `— / —` / "no tasks generated yet" affordances instead of `0/0`.
 */
export interface PlanView {
  id: number;
  /**
   * The plan's composite directory name (`{id}--{slug}`), e.g.
   * `103--composite-plan-id-web-routing`. The canonical, URL-safe key used to
   * address the plan in routes and plan-scoped API calls.
   */
  name: string;
  /** Directory slug with the `NN--` id prefix stripped, e.g. `plans-screens`. */
  slug: string;
  /** Human-facing title derived from the slug (the API carries no title). */
  title: string;
  /** One-line plan summary from the plan frontmatter. */
  summary: string;
  state: PlanState;
  /** Completed task count, or `null` when no tasks exist yet. */
  done: number | null;
  /** Total task count, or `null` when no tasks exist yet. */
  total: number | null;
  /** Inferred execution phase count, or `null` when unknown. */
  phases: number | null;
  /** ISO created date from frontmatter, when present. */
  created: string;
  /** Completion date, when the API surfaces one (currently never). */
  completedAt?: string;
}

/** Strips a leading `NN--` numeric id prefix from a plan directory name. */
export const stripIdPrefix = (name: string): string => name.replace(/^\d+--/, '');

/** Turns a kebab/underscore slug into a Title Cased, space-separated label. */
export const humanizeSlug = (slug: string): string =>
  slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Narrows an arbitrary API state string to a known state, else `undefined`. */
const knownState = (state: string): PlanState | undefined =>
  (KNOWN_STATES as readonly string[]).includes(state) ? (state as PlanState) : undefined;

/**
 * Adapts one API `PlanSummary` to the view shape. The only place raw API field
 * names are read. Drafted plans (no tasks, `total === 0`) map their counts to
 * `null`; `phaseCount === 0` maps to `null`. Never throws on missing optionals.
 */
export const mapPlan = (api: PlanSummary): PlanView => {
  const slug = stripIdPrefix(api.name);
  const hasTasks = typeof api.total === 'number' && api.total > 0;
  return {
    id: api.id,
    name: api.name,
    slug,
    title: humanizeSlug(slug),
    summary: api.summary ?? '',
    state: knownState(api.state) ?? 'drafted',
    done: hasTasks ? api.done : null,
    total: hasTasks ? api.total : null,
    phases: typeof api.phaseCount === 'number' && api.phaseCount > 0 ? api.phaseCount : null,
    created: api.created ?? '',
    completedAt: undefined,
  };
};

/** The All / Active / Drafts tab counters derived from the mapped plan list. */
export interface TabCounts {
  all: number;
  active: number;
  drafts: number;
}

/**
 * Derives the tab counters per the plan's clarification #5:
 *   All    = total active plans,
 *   Active = plans in `doing` or `ready`,
 *   Drafts = plans in `drafted`.
 */
export const tabCounts = (plans: PlanView[]): TabCounts => ({
  all: plans.length,
  active: plans.filter(p => p.state === 'doing' || p.state === 'ready').length,
  drafts: plans.filter(p => p.state === 'drafted').length,
});

/** Progress percentage in [0, 100]; `0` when counts are null (never divides by zero). */
export const progressPct = (done: number | null, total: number | null): number => {
  if (total == null || total === 0 || done == null) return 0;
  return (done / total) * 100;
};

/** The `done/total` label, or `— / —` when counts are unknown. */
export const progressLabel = (done: number | null, total: number | null): string =>
  total == null || done == null ? '— / —' : `${done}/${total}`;

/** A mapped plan list grouped by lifecycle state. Unknown states are dropped, never thrown. */
export interface StateGroups {
  drafted: PlanView[];
  ready: PlanView[];
  doing: PlanView[];
  done: PlanView[];
}

/**
 * Groups plans into the four known buckets. A plan whose `state` is not one of
 * the known states is omitted rather than crashing the caller.
 */
export const groupByState = (plans: PlanView[]): StateGroups => {
  const groups: StateGroups = { drafted: [], ready: [], doing: [], done: [] };
  for (const plan of plans) {
    if (plan.state in groups) groups[plan.state].push(plan);
  }
  return groups;
};

/**
 * The plan's markdown path. Reimplements the design's `planMdPath`, correcting
 * its stale `.ai/task-manager/` root and em-dash separator to the strikethroo
 * `.ai/strikethroo/` root and `--` separator. Keyed off the plan's composite
 * `name` (the authoritative directory key) rather than re-concatenating
 * `${id}--${slug}`. The no-name case uses the `NN--slug` placeholder.
 */
export const planMdPath = (plan: Pick<PlanView, 'name'>): string => {
  const dir = plan.name;
  if (!dir) return '.ai/strikethroo/plans/NN--slug/plan-NN--slug.md';
  return `.ai/strikethroo/plans/${dir}/plan-${dir}.md`;
};

/**
 * Heading match for the Results boundary: the "Notes" or "Execution Blueprint"
 * section (case-insensitive). These are the execution-time tail of a plan body;
 * in the canonical structure `## Notes` is the last narrative section and
 * `## Execution Blueprint` is appended after it during task generation, but a few
 * older plans order them the other way — so the split point is whichever appears
 * first.
 */
const RESULTS_BOUNDARY_RE = /^(notes|execution\s+blueprint)\b/i;

/**
 * Splits the parsed `##` sections of a plan body at the Results boundary
 * (inclusive): `planSections` are the narrative sections before it;
 * `resultsSections` are the first of "Notes" / "Execution Blueprint" and
 * everything after it, to EOF. When neither heading exists, all sections stay in
 * `planSections` and `resultsSections` is empty. The Plan tab renders
 * `planSections`; the Results tab renders `resultsSections`.
 */
export const splitResultsSections = (
  sections: MarkdownSection[]
): { planSections: MarkdownSection[]; resultsSections: MarkdownSection[] } => {
  const idx = sections.findIndex(s => RESULTS_BOUNDARY_RE.test(s.heading));
  if (idx === -1) return { planSections: sections, resultsSections: [] };
  return { planSections: sections.slice(0, idx), resultsSections: sections.slice(idx) };
};

/**
 * Heading match for the task-body Implementation Notes boundary
 * (case-insensitive). `## Implementation Notes` is the execution-time tail of a
 * task body; everything before it is the task narrative.
 */
const NOTES_BOUNDARY_RE = /^implementation\s+notes\b/i;

/**
 * Splits the parsed `##` sections of a task body at the Implementation Notes
 * boundary (inclusive): `bodySections` are the narrative sections before it;
 * `notesSections` are the "Implementation Notes" section and everything after
 * it, to EOF. When the heading does not exist, all sections stay in
 * `bodySections` and `notesSections` is empty. The Task tab renders
 * `bodySections`; the Implementation Notes tab renders `notesSections`.
 */
export const splitTaskSections = (
  sections: MarkdownSection[]
): { bodySections: MarkdownSection[]; notesSections: MarkdownSection[] } => {
  const idx = sections.findIndex(s => NOTES_BOUNDARY_RE.test(s.heading));
  if (idx === -1) return { bodySections: sections, notesSections: [] };
  return { bodySections: sections.slice(0, idx), notesSections: sections.slice(idx) };
};

/**
 * Unwraps a root `<details>` disclosure in a task notes body. Task generators
 * commonly wrap the entire `## Implementation Notes` content in a single
 * `<details><summary>…</summary>…</details>` block; in the Implementation Notes
 * tab that collapsible is redundant (the tab itself is the disclosure), so this
 * lifts the inner content out — dropping the `<details>` wrapper and the leading
 * `<summary>` label. When the trimmed content is not a single root `<details>`
 * block, it is returned unchanged.
 */
export const unwrapRootDetails = (content: string): string => {
  const match = content.trim().match(/^<details\b[^>]*>([\s\S]*)<\/details>\s*$/i);
  if (!match) return content;
  return match[1].replace(/^\s*<summary\b[^>]*>[\s\S]*?<\/summary>/i, '').trim();
};

/** A single progress dot's render state, mirroring the design's `progressDots`. */
export type ProgressDot = 'done' | 'doing' | 'pending';

/**
 * Reproduces the design's `progressDots` logic: indices `< done` are `done`,
 * the dot at `index === done` while `doing` is `doing`, all others `pending`.
 * Returns an empty array when `total` is null (no tasks generated yet).
 */
export const progressDots = (
  done: number | null,
  total: number | null,
  state: PlanState
): ProgressDot[] => {
  if (total == null) return [];
  const completed = done ?? 0;
  const dots: ProgressDot[] = [];
  for (let i = 0; i < total; i++) {
    if (i < completed) dots.push('done');
    else if (state === 'doing' && i === completed) dots.push('doing');
    else dots.push('pending');
  }
  return dots;
};
