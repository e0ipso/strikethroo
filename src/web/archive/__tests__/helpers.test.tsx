/**
 * Unit tests for the Archive helpers (Plan 90, Task 001).
 *
 * Covers the custom logic worth testing per the project's test philosophy: the
 * regex-escaped query path, a query matching nothing, `created`-based search,
 * date-range filtering and month grouping (archived plans carry only `created`,
 * which is the screen's sole date axis), the sort comparator, the `highlight`
 * fragment/`<mark>` output and its nullish-`text` guard, and the `archiveStats`
 * reduction. React output is asserted structurally on the element tree (no DOM
 * / testing-library dependency), which is sufficient to prove `highlight`
 * builds `<mark>` elements rather than using `dangerouslySetInnerHTML`.
 */

import { isValidElement, type ReactElement } from 'react';
import {
  archiveStats,
  byCreatedDesc,
  filterByDateRange,
  filterPlans,
  groupByMonth,
  highlight,
  type ArchivePlanView,
} from '../helpers';

/** Builds an archived-plan view with sensible defaults. */
const plan = (over: Partial<ArchivePlanView> & Pick<ArchivePlanView, 'id'>): ArchivePlanView => ({
  slug: `slug-${over.id}`,
  title: `Title ${over.id}`,
  summary: `Summary ${over.id}`,
  done: 1,
  total: 1,
  phaseCount: 1,
  created: '2026-01-01',
  archived: true,
  ...over,
});

/** Flattens highlight() output into an array of React nodes for inspection. */
const nodes = (out: ReturnType<typeof highlight>): unknown[] => (Array.isArray(out) ? out : [out]);

describe('filterPlans', () => {
  it('returns every plan for an empty query', () => {
    const plans = [plan({ id: 1 }), plan({ id: 2 })];
    expect(filterPlans(plans, '')).toEqual(plans);
  });

  it('matches case-insensitively across title, slug, summary, and created', () => {
    const plans = [
      plan({ id: 1, title: 'Cache invalidation' }),
      plan({ id: 2, summary: 'webform conditional logic' }),
      plan({ id: 3, created: '2026-03-15' }),
      plan({ id: 4, slug: 'path-alias-migration' }),
    ];
    expect(filterPlans(plans, 'CACHE').map(p => p.id)).toEqual([1]);
    expect(filterPlans(plans, 'webform').map(p => p.id)).toEqual([2]);
    // Only id 3 has a 2026-03 created date; the rest default to 2026-01-01.
    expect(filterPlans(plans, '2026-03').map(p => p.id)).toEqual([3]);
    expect(filterPlans(plans, 'alias').map(p => p.id)).toEqual([4]);
  });

  it('escapes regex metacharacters so they match literally and never throw', () => {
    const plans = [
      plan({ id: 1, summary: 'totals (a+b)*c' }),
      plan({ id: 2, summary: 'no parens' }),
    ];
    // '(a+b)*' is invalid/greedy as a raw regex; escaped it must match literally.
    expect(() => filterPlans(plans, '(a+b)*')).not.toThrow();
    expect(filterPlans(plans, '(a+b)*').map(p => p.id)).toEqual([1]);
  });

  it('returns nothing when the query matches no field', () => {
    const plans = [plan({ id: 1 }), plan({ id: 2 })];
    expect(filterPlans(plans, 'zzz-no-match')).toEqual([]);
  });

  it('matches on the created date and does not throw on an empty created', () => {
    const dated = [plan({ id: 1, created: '2026-07-04', title: 'x', slug: 'x', summary: 'x' })];
    expect(filterPlans(dated, '2026-07').map(p => p.id)).toEqual([1]);
    const undatedish = [plan({ id: 2, created: '', title: 'x', slug: 'x', summary: 'x' })];
    expect(() => filterPlans(undatedish, '2026')).not.toThrow();
    expect(filterPlans(undatedish, '2026')).toEqual([]);
  });
});

describe('highlight', () => {
  it('wraps matches in <mark className="mark"> and leaves the rest as fragments', () => {
    const out = nodes(highlight('cache invalidation cache', 'cache'));
    const marks = out.filter((n): n is ReactElement => isValidElement(n) && n.type === 'mark');
    expect(marks).toHaveLength(2);
    marks.forEach(m => expect((m.props as { className?: string }).className).toBe('mark'));
    // No node uses dangerouslySetInnerHTML.
    out.forEach(n => {
      if (isValidElement(n)) {
        expect((n.props as Record<string, unknown>).dangerouslySetInnerHTML).toBeUndefined();
      }
    });
  });

  it('returns the text unchanged for an empty query', () => {
    expect(highlight('plain text', '')).toBe('plain text');
  });

  it('renders nothing for nullish text without throwing', () => {
    expect(highlight(undefined, 'q')).toBeNull();
    expect(highlight(null, 'q')).toBeNull();
  });
});

describe('archiveStats', () => {
  it('sums plans, tasks (total), and phases (phaseCount)', () => {
    const plans = [
      plan({ id: 1, total: 6, phaseCount: 3 }),
      plan({ id: 2, total: 8, phaseCount: 4 }),
      plan({ id: 3, total: 5, phaseCount: 2 }),
    ];
    expect(archiveStats(plans)).toEqual({ totalPlans: 3, totalTasks: 19, totalPhases: 9 });
  });

  it('returns zeros for an empty list', () => {
    expect(archiveStats([])).toEqual({ totalPlans: 0, totalTasks: 0, totalPhases: 0 });
  });
});

describe('byCreatedDesc', () => {
  it('orders by created descending', () => {
    const plans = [
      plan({ id: 1, created: '2026-02-12' }),
      plan({ id: 2, created: '2026-05-13' }),
      plan({ id: 3, created: '2026-03-15' }),
    ];
    expect([...plans].sort(byCreatedDesc).map(p => p.id)).toEqual([2, 3, 1]);
  });

  it('treats an absent created as the lowest key', () => {
    const plans = [
      plan({ id: 1, created: '' }),
      plan({ id: 2, created: '2026-05-13' }),
      plan({ id: 3, created: '2026-02-01' }),
    ];
    expect([...plans].sort(byCreatedDesc).map(p => p.id)).toEqual([2, 3, 1]);
  });
});

describe('filterByDateRange', () => {
  it('returns the list unchanged for an empty range (no bounds)', () => {
    const plans = [plan({ id: 1, created: '2026-03-01' }), plan({ id: 2 })];
    expect(filterByDateRange(plans, '', '')).toEqual(plans);
    expect(filterByDateRange(plans, undefined, undefined)).toEqual(plans);
  });

  it('includes the inclusive from/to boundary dates', () => {
    const plans = [
      plan({ id: 1, created: '2026-03-01' }),
      plan({ id: 2, created: '2026-03-15' }),
      plan({ id: 3, created: '2026-03-31' }),
      plan({ id: 4, created: '2026-04-01' }),
    ];
    expect(filterByDateRange(plans, '2026-03-01', '2026-03-31').map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('applies an open-ended bound when only one side is set', () => {
    const plans = [plan({ id: 1, created: '2026-02-01' }), plan({ id: 2, created: '2026-05-01' })];
    expect(filterByDateRange(plans, '2026-03-01', undefined).map(p => p.id)).toEqual([2]);
    expect(filterByDateRange(plans, undefined, '2026-03-01').map(p => p.id)).toEqual([1]);
  });

  it('excludes plans with no created date once any bound is set', () => {
    const plans = [plan({ id: 1, created: '' }), plan({ id: 2, created: '2026-03-10' })];
    expect(filterByDateRange(plans, '2026-01-01', '2026-12-31').map(p => p.id)).toEqual([2]);
  });
});

describe('groupByMonth', () => {
  it('returns [] for an empty input', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('buckets plans by YYYY-MM and orders months descending', () => {
    const plans = [
      plan({ id: 1, created: '2026-02-12' }),
      plan({ id: 2, created: '2026-05-13' }),
      plan({ id: 3, created: '2026-05-02' }),
      plan({ id: 4, created: '2026-03-15' }),
    ];
    const groups = groupByMonth(plans);
    expect(groups.map(g => g.month)).toEqual(['2026-05', '2026-03', '2026-02']);
    expect(groups.map(g => g.label)).toEqual(['May 2026', 'March 2026', 'February 2026']);
    expect(groups[0]?.plans.map(p => p.id)).toEqual([2, 3]);
  });

  it('routes a plan with no created date to the trailing No date bucket', () => {
    const plans = [plan({ id: 1, created: '' }), plan({ id: 2, created: '2026-04-10' })];
    const groups = groupByMonth(plans);
    expect(groups.map(g => g.month)).toEqual(['2026-04', 'unknown']);
    const unknown = groups[groups.length - 1];
    expect(unknown?.label).toBe('No date');
    expect(unknown?.plans.map(p => p.id)).toEqual([1]);
  });

  it('does not mutate the input array', () => {
    const plans = [plan({ id: 1, created: '2026-02-01' }), plan({ id: 2, created: '2026-05-01' })];
    const snapshot = plans.map(p => p.id);
    groupByMonth(plans);
    expect(plans.map(p => p.id)).toEqual(snapshot);
  });
});
