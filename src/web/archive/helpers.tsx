/**
 * Pure client-side helpers for the Archive screen (Plan 90, Task 001).
 *
 * Reimplements the design's `filterPlans` / `highlight` / `archiveStats`
 * (`scratch/ui/designs/screens-archive.jsx` lines 51-74) but parameterized over
 * a passed-in `plans` array — there is no module-level `ARCHIVE_PLANS` mock.
 * Every helper is pure and individually exported so it is unit-checkable and
 * reusable by the route component (Task 002).
 *
 * The live `/api/plans` model names the phase field `phaseCount` (clarification
 * #2), unlike the design's `phases`; these helpers consume `phaseCount`.
 * `completedAt` and `branch` are optional and every helper guards their absence.
 */

import { Fragment, type ReactNode } from 'react';

/**
 * The archived-plan view shape these helpers and the Archive route consume.
 * Mirrors the data model's guaranteed fields (clarification #2); `completedAt`
 * and `branch` are optional and may be absent for a given archived plan.
 */
export interface ArchivePlanView {
  id: number;
  slug: string;
  title: string;
  summary: string;
  done: number;
  total: number;
  phaseCount: number;
  created: string;
  archived: boolean;
  completedAt?: string;
  branch?: string;
}

/** Escapes regex metacharacters so a user query matches literally. */
const escapeRegExp = (query: string): string => query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Case-insensitive substring filter across `title`, `slug`, `summary`, and
 * `completedAt` (skipped when absent). An empty query returns the list as-is.
 * The query is regex-escaped so metacharacters match literally and never throw.
 */
export function filterPlans<T extends ArchivePlanView>(plans: T[], query: string): T[] {
  if (!query) return plans;
  const re = new RegExp(escapeRegExp(query), 'i');
  return plans.filter(
    p =>
      re.test(p.title) ||
      re.test(p.slug) ||
      re.test(p.summary) ||
      (p.completedAt != null && re.test(p.completedAt))
  );
}

/**
 * Wraps each case-insensitive match of `query` in `text` with a
 * `<mark className="mark">`, leaving the rest as fragments. Returns React nodes
 * (never `dangerouslySetInnerHTML`). An empty query returns the text unchanged;
 * a nullish `text` renders nothing (no throw).
 */
export function highlight(text: string | null | undefined, query: string): ReactNode {
  if (text == null) return null;
  const value = String(text);
  if (!query) return value;
  const escaped = escapeRegExp(query);
  const parts = value.split(new RegExp(`(${escaped})`, 'ig'));
  const matcher = new RegExp(`^${escaped}$`, 'i');
  return parts.map((part, i) =>
    matcher.test(part) ? (
      <mark key={i} className="mark">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/** Aggregate archive totals derived by reduction over the plan list. */
export interface ArchiveStats {
  totalPlans: number;
  totalTasks: number;
  totalPhases: number;
}

/**
 * Sums archived plans, completed tasks (`total`), and phases (`phaseCount`)
 * over the list. Missing numeric fields are treated as zero.
 */
export function archiveStats(plans: ArchivePlanView[]): ArchiveStats {
  return plans.reduce<ArchiveStats>(
    (acc, p) => ({
      totalPlans: acc.totalPlans + 1,
      totalTasks: acc.totalTasks + (p.total ?? 0),
      totalPhases: acc.totalPhases + (p.phaseCount ?? 0),
    }),
    { totalPlans: 0, totalTasks: 0, totalPhases: 0 }
  );
}

/**
 * Comparator ordering by `completedAt` descending, falling back to `created`
 * for whichever side lacks `completedAt`. ISO `YYYY-MM-DD` dates compare
 * correctly with a lexicographic string compare.
 */
export function byCompletedDesc(a: ArchivePlanView, b: ArchivePlanView): number {
  const aKey = a.completedAt ?? a.created ?? '';
  const bKey = b.completedAt ?? b.created ?? '';
  if (aKey === bKey) return 0;
  return aKey < bKey ? 1 : -1;
}
