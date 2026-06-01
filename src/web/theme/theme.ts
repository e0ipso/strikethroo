/**
 * Framework-agnostic theme controller.
 *
 * Single source of truth for the tri-state theme preference. Pure logic
 * (parse/resolve) is isolated from DOM/storage access so it is unit-testable
 * under jest's `node` environment. All browser-global access is guarded against
 * absent globals and never throws. This module must NOT import React.
 */

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'strikethroo-theme';

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

/** Validate a raw stored value; fall back to `system` for null/unknown/corrupt. */
export function parseTheme(raw: string | null): Theme {
  return raw && (THEMES as readonly string[]).includes(raw) ? (raw as Theme) : 'system';
}

/** Resolve a preference to a concrete effective theme. */
export function resolveTheme(pref: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}

/** Read the persisted preference; never throws when storage is absent/broken. */
export function readStoredTheme(): Theme {
  try {
    return parseTheme(globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null);
  } catch {
    return 'system';
  }
}

/** Persist the preference; never throws when storage is absent/broken. */
export function persistTheme(t: Theme): void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

/** Whether the OS currently prefers a dark color scheme; guarded. */
export function prefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Toggle the `.dark` class on the document root; guarded against absent DOM. */
export function applyTheme(effective: 'light' | 'dark'): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.classList.toggle('dark', effective === 'dark');
}

/**
 * Subscribe to OS color-scheme changes. Returns an unsubscribe function.
 * Guarded against absent `matchMedia`.
 */
export function subscribeSystem(onChange: () => void): () => void {
  const mql = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mql) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}
