/**
 * Unit tests for the Archive helpers (Plan 90, Task 001).
 *
 * Covers the custom logic worth testing per the project's test philosophy: the
 * regex-escaped query path, a query matching nothing, optional-`completedAt`
 * handling in both `filterPlans` and the sort comparator, the `highlight`
 * fragment/`<mark>` output and its nullish-`text` guard, and the `archiveStats`
 * reduction. React output is asserted structurally on the element tree (no DOM
 * / testing-library dependency), which is sufficient to prove `highlight`
 * builds `<mark>` elements rather than using `dangerouslySetInnerHTML`.
 */

import { isValidElement, type ReactElement } from 'react';
import {
  archiveStats,
  byCompletedDesc,
  filterPlans,
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
const nodes = (out: ReturnType<typeof highlight>): unknown[] =>
  Array.isArray(out) ? out : [out];

describe('filterPlans', () => {
  it('returns every plan for an empty query', () => {
    const plans = [plan({ id: 1 }), plan({ id: 2 })];
    expect(filterPlans(plans, '')).toEqual(plans);
  });

  it('matches case-insensitively across title, slug, summary, and completedAt', () => {
    const plans = [
      plan({ id: 1, title: 'Cache invalidation' }),
      plan({ id: 2, summary: 'webform conditional logic' }),
      plan({ id: 3, completedAt: '2026-03-15' }),
      plan({ id: 4, slug: 'path-alias-migration' }),
    ];
    expect(filterPlans(plans, 'CACHE').map(p => p.id)).toEqual([1]);
    expect(filterPlans(plans, 'webform').map(p => p.id)).toEqual([2]);
    expect(filterPlans(plans, '2026-03').map(p => p.id)).toEqual([3]);
    expect(filterPlans(plans, 'alias').map(p => p.id)).toEqual([4]);
  });

  it('escapes regex metacharacters so they match literally and never throw', () => {
    const plans = [plan({ id: 1, summary: 'totals (a+b)*c' }), plan({ id: 2, summary: 'no parens' })];
    // '(a+b)*' is invalid/greedy as a raw regex; escaped it must match literally.
    expect(() => filterPlans(plans, '(a+b)*')).not.toThrow();
    expect(filterPlans(plans, '(a+b)*').map(p => p.id)).toEqual([1]);
  });

  it('returns nothing when the query matches no field', () => {
    const plans = [plan({ id: 1 }), plan({ id: 2 })];
    expect(filterPlans(plans, 'zzz-no-match')).toEqual([]);
  });

  it('skips completedAt when it is absent (no throw, no false match)', () => {
    const plans = [plan({ id: 1, completedAt: undefined, title: 'x', slug: 'x', summary: 'x' })];
    expect(() => filterPlans(plans, '2026')).not.toThrow();
    expect(filterPlans(plans, '2026')).toEqual([]);
  });
});

describe('highlight', () => {
  it('wraps matches in <mark className="mark"> and leaves the rest as fragments', () => {
    const out = nodes(highlight('cache invalidation cache', 'cache'));
    const marks = out.filter(
      (n): n is ReactElement => isValidElement(n) && n.type === 'mark'
    );
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

describe('byCompletedDesc', () => {
  it('orders by completedAt descending', () => {
    const plans = [
      plan({ id: 1, completedAt: '2026-02-12' }),
      plan({ id: 2, completedAt: '2026-05-13' }),
      plan({ id: 3, completedAt: '2026-03-15' }),
    ];
    expect([...plans].sort(byCompletedDesc).map(p => p.id)).toEqual([2, 3, 1]);
  });

  it('falls back to created when completedAt is missing on a side', () => {
    const plans = [
      plan({ id: 1, completedAt: undefined, created: '2026-04-01' }),
      plan({ id: 2, completedAt: '2026-05-13', created: '2026-01-01' }),
      plan({ id: 3, completedAt: undefined, created: '2026-02-01' }),
    ];
    // Sort keys: id1 -> 2026-04-01, id2 -> 2026-05-13, id3 -> 2026-02-01.
    expect([...plans].sort(byCompletedDesc).map(p => p.id)).toEqual([2, 1, 3]);
  });
});
