/**
 * Framework-agnostic sidebar-collapse controller.
 *
 * Single source of truth for the left-rail collapsed preference. Pure parsing
 * is isolated from storage access so it is unit-testable under Vitest's `node`
 * environment, and all browser-global access is guarded against absent globals
 * and never throws. Mirrors the theme controller's shape (see ./theme.ts).
 * This module must NOT import React.
 */

export const RAIL_STORAGE_KEY = 'strikethroo-rail-collapsed';

/** Validate a raw stored value; only the literal `'1'` means collapsed. */
export function parseCollapsed(raw: string | null): boolean {
  return raw === '1';
}

/** Read the persisted collapsed preference; never throws when storage is absent/broken. */
export function readStoredCollapsed(): boolean {
  try {
    return parseCollapsed(globalThis.localStorage?.getItem(RAIL_STORAGE_KEY) ?? null);
  } catch {
    return false;
  }
}

/** Persist the collapsed preference; never throws when storage is absent/broken. */
export function persistCollapsed(collapsed: boolean): void {
  try {
    globalThis.localStorage?.setItem(RAIL_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}
