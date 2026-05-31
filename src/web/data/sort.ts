/**
 * Shared client-side table sort mechanism for the Strikethroo SPA.
 *
 * A single, generic source of truth for table sort behavior consumed by the
 * Plans List table and the Archive table. This module owns the comparator
 * logic (numbers compared numerically, strings via `localeCompare`, date-ish
 * strings via `Date.parse` with a string-compare fallback) and the active
 * sort key + direction state shape with its header-click toggle contract.
 *
 * It is deliberately generic: it bakes in no Plans- or Archive-specific column
 * knowledge. Callers supply their own accessor map keyed by their own column
 * keys. It performs no fetching and mutates no input — `sortRows` always
 * returns a fresh array.
 */

import { useCallback, useState } from 'react';

/** Sort direction. */
export type SortDir = 'asc' | 'desc';

/** Active sort state: which column key is sorted, and in which direction. */
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/**
 * Compares two raw cell values, resolving the comparison strategy from the
 * runtime value types:
 *
 * - both numbers -> numeric comparison
 * - both date-ish strings (parseable by `Date.parse`) -> chronological
 * - otherwise -> string `localeCompare` of their stringified forms
 *
 * Nullish values sort last (treated as the largest). Equal values return 0,
 * which combined with a stable `Array.prototype.sort` preserves relative order.
 */
function compareValues(a: unknown, b: unknown): number {
  // Nullish / empty handling: push absent values to the end (ascending).
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  const as = String(a);
  const bs = String(b);

  // Date-ish strings: compare chronologically when both parse.
  const at = Date.parse(as);
  const bt = Date.parse(bs);
  if (!Number.isNaN(at) && !Number.isNaN(bt)) {
    return at < bt ? -1 : at > bt ? 1 : 0;
  }

  return as.localeCompare(bs);
}

/**
 * Pure comparator factory. Produces a `(a, b) => number` comparator that reads
 * each row's cell value through `accessor` and orders by `dir`. Descending is
 * the negation of the ascending comparison; equal values remain 0 (stable).
 */
export function makeComparator<T>(
  accessor: (row: T) => unknown,
  dir: SortDir
): (a: T, b: T) => number {
  return (a, b) => {
    const cmp = compareValues(accessor(a), accessor(b));
    return dir === 'desc' ? -cmp : cmp;
  };
}

/**
 * Returns a NEW array of `rows` sorted per `state`, resolving the column
 * accessor from `accessors`. Never mutates the input array. If the active key
 * has no accessor, the input order is preserved (returned as a fresh copy).
 */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  accessors: Record<K, (row: T) => unknown>,
  state: SortState<K>
): T[] {
  const accessor = accessors[state.key];
  if (!accessor) return [...rows];
  return [...rows].sort(makeComparator(accessor, state.dir));
}

/**
 * Pure state transition for the header-click toggle contract: selecting a new
 * column picks it with a default `desc` direction; re-selecting the already
 * active column flips its direction. Exported so the contract is unit-testable
 * without a React renderer (the hook is a thin `useState` wrapper over this).
 */
export function nextSortState<K extends string>(prev: SortState<K>, key: K): SortState<K> {
  if (prev.key === key) {
    return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'desc' };
}

/**
 * Reusable table-sort hook. Holds the active `SortState` and exposes a
 * `toggle(key)` handler implementing the header-click contract (see
 * `nextSortState`): clicking a new column selects it (defaulting to `desc`);
 * clicking the already-active column flips its direction.
 */
export function useTableSort<K extends string>(
  initial: SortState<K>
): {
  state: SortState<K>;
  toggle: (key: K) => void;
} {
  const [state, setState] = useState<SortState<K>>(initial);

  const toggle = useCallback((key: K) => {
    setState(prev => nextSortState(prev, key));
  }, []);

  return { state, toggle };
}
