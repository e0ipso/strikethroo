/**
 * Unit tests for the shared client-side table sort mechanism
 * (`src/web/data/sort.ts`, Plan 95, Task 03).
 *
 * Per the project's test philosophy — write a few tests, mostly integration;
 * test custom logic, not the framework — this covers the only non-trivial
 * custom logic in the module: the heterogeneous-type comparator (numeric,
 * string, date-ish), the no-mutation `sortRows` convenience, and the
 * header-click toggle transition (`nextSortState`). React's `useState` and the
 * trivial `useTableSort` wrapper are framework-owned and not retested.
 */

import { makeComparator, sortRows, nextSortState } from '../web/data/sort';
import type { SortState } from '../web/data/sort';

/** Heterogeneous row shape mirroring the serve API view-model column types. */
interface Row {
  id: number;
  title: string;
  completedAt?: string;
}

const accessors = {
  id: (r: Row) => r.id,
  title: (r: Row) => r.title,
  completedAt: (r: Row) => r.completedAt,
} satisfies Record<string, (r: Row) => unknown>;

type Key = keyof typeof accessors;

const row = (id: number, title: string, completedAt?: string): Row => ({
  id,
  title,
  completedAt,
});

describe('makeComparator', () => {
  it('orders numbers numerically (not lexicographically) ascending and descending', () => {
    const rows = [row(10, 'a'), row(2, 'b'), row(1, 'c')];
    const asc = [...rows].sort(makeComparator<Row>(r => r.id, 'asc'));
    expect(asc.map(r => r.id)).toEqual([1, 2, 10]);

    const desc = [...rows].sort(makeComparator<Row>(r => r.id, 'desc'));
    expect(desc.map(r => r.id)).toEqual([10, 2, 1]);
  });

  it('orders strings via localeCompare with case handling', () => {
    const rows = [row(1, 'banana'), row(2, 'Apple'), row(3, 'cherry')];
    const asc = [...rows].sort(makeComparator<Row>(r => r.title, 'asc'));
    // localeCompare is case-insensitive-leaning: Apple < banana < cherry.
    expect(asc.map(r => r.title)).toEqual(['Apple', 'banana', 'cherry']);
  });

  it('orders date-ish strings chronologically and pushes missing/empty last', () => {
    const rows = [row(1, 'x', '2026-03-01'), row(2, 'y', ''), row(3, 'z', '2025-12-31')];
    const asc = [...rows].sort(makeComparator<Row>(r => r.completedAt, 'asc'));
    // Chronological, with the empty value sorted to the end.
    expect(asc.map(r => r.id)).toEqual([3, 1, 2]);
  });

  it('returns 0 for equal values (stable)', () => {
    const cmp = makeComparator<Row>(r => r.id, 'asc');
    expect(cmp(row(5, 'a'), row(5, 'b'))).toBe(0);
  });
});

describe('sortRows', () => {
  it('returns a new sorted array and does not mutate the input', () => {
    const input = [row(3, 'c'), row(1, 'a'), row(2, 'b')];
    const snapshot = input.map(r => r.id);
    const state: SortState<Key> = { key: 'id', dir: 'asc' };

    const result = sortRows(input, accessors, state);

    expect(result).not.toBe(input);
    expect(result.map(r => r.id)).toEqual([1, 2, 3]);
    // Input array untouched.
    expect(input.map(r => r.id)).toEqual(snapshot);
  });

  it('preserves relative order of equal values (stable sort)', () => {
    const a = row(1, 'same');
    const b = row(1, 'same');
    const c = row(1, 'same');
    const result = sortRows([a, b, c], accessors, { key: 'id', dir: 'asc' });
    expect(result).toEqual([a, b, c]);
    expect(result[0]).toBe(a);
    expect(result[2]).toBe(c);
  });
});

describe('nextSortState (toggle contract)', () => {
  it('selects a new column with a default desc direction', () => {
    const prev: SortState<Key> = { key: 'id', dir: 'asc' };
    expect(nextSortState(prev, 'title')).toEqual({ key: 'title', dir: 'desc' });
  });

  it('flips direction when the column is already active', () => {
    const prev: SortState<Key> = { key: 'title', dir: 'desc' };
    const flipped = nextSortState(prev, 'title');
    expect(flipped).toEqual({ key: 'title', dir: 'asc' });
    expect(nextSortState(flipped, 'title')).toEqual({ key: 'title', dir: 'desc' });
  });
});
