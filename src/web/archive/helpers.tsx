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
 *
 * Date axis: archived plans carry no completion date — the model surfaces only
 * `created` (from plan frontmatter). `created` is therefore THE date these
 * helpers sort, filter, and group by; it is not a fallback for an absent
 * `completedAt`. `branch` is optional and guarded.
 */

import { Fragment, type ReactNode } from 'react';

/**
 * The archived-plan view shape these helpers and the Archive route consume.
 * Mirrors the data model's guaranteed fields (clarification #2). `created` is
 * the only date the model surfaces for an archived plan; `branch` is optional.
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
  branch?: string;
}

/** Escapes regex metacharacters so a user query matches literally. */
const escapeRegExp = (query: string): string => query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Case-insensitive substring filter across `title`, `slug`, `summary`, and
 * `created` (the plan's only date). An empty query returns the list as-is. The
 * query is regex-escaped so metacharacters match literally and never throw.
 */
export function filterPlans<T extends ArchivePlanView>(plans: T[], query: string): T[] {
  if (!query) return plans;
  const re = new RegExp(escapeRegExp(query), 'i');
  return plans.filter(
    p => re.test(p.title) || re.test(p.slug) || re.test(p.summary) || re.test(p.created)
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
 * Comparator ordering by `created` descending. ISO `YYYY-MM-DD` dates compare
 * correctly with a lexicographic string compare.
 */
export function byCreatedDesc(a: ArchivePlanView, b: ArchivePlanView): number {
  const aKey = a.created ?? '';
  const bKey = b.created ?? '';
  if (aKey === bKey) return 0;
  return aKey < bKey ? 1 : -1;
}

/**
 * Inclusive lexicographic date-range filter over `created`. `from`/`to` are ISO
 * `YYYY-MM-DD` strings (or empty/undefined for an open bound); ISO dates compare
 * correctly with plain string comparison. Plans with no `created` are excluded
 * whenever either bound is set (they have no date to place in the range). An
 * empty range (both bounds absent) returns the list unchanged. Pure: never
 * mutates the input.
 */
export function filterByDateRange<T extends ArchivePlanView>(
  plans: T[],
  from?: string,
  to?: string
): T[] {
  if (!from && !to) return plans;
  return plans.filter(p => {
    const key = p.created;
    if (key == null || key === '') return false;
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
}

/** A month bucket: the `YYYY-MM` key, a human label, and its member plans. */
export interface MonthGroup {
  month: string;
  label: string;
  plans: ArchivePlanView[];
}

/** Month names indexed by zero-based month number, for `YYYY-MM` labels. */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Sentinel key/label for plans with no usable `created` date. */
const UNKNOWN_MONTH = 'unknown';
const UNKNOWN_LABEL = 'No date';

/** Turns a `YYYY-MM` key into a human label (e.g. `2026-05` -> `May 2026`). */
function monthLabel(key: string): string {
  if (key === UNKNOWN_MONTH) return UNKNOWN_LABEL;
  const [year, month] = key.split('-');
  const name = MONTH_NAMES[Number(month) - 1];
  return name ? `${name} ${year}` : key;
}

/**
 * Groups plans by month, deriving the `YYYY-MM` key from the first 7 chars of
 * `created`. Plans with no `created` go to an explicit "No date" bucket rather
 * than being dropped. Real months are returned in descending order; the unknown
 * bucket (if any) is sorted last. Pure: never mutates the input array or its
 * members.
 */
export function groupByMonth(plans: ArchivePlanView[]): MonthGroup[] {
  const buckets = new Map<string, ArchivePlanView[]>();
  for (const p of plans) {
    const raw = p.created;
    const key = raw && raw.length >= 7 ? raw.slice(0, 7) : UNKNOWN_MONTH;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
    else buckets.set(key, [p]);
  }
  return [...buckets.keys()]
    .sort((a, b) => {
      if (a === UNKNOWN_MONTH) return 1;
      if (b === UNKNOWN_MONTH) return -1;
      return a < b ? 1 : a > b ? -1 : 0;
    })
    .map(month => ({ month, label: monthLabel(month), plans: buckets.get(month)! }));
}
