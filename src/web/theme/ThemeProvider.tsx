/**
 * React context wiring for the framework-agnostic theme controller (`./theme`).
 *
 * Holds the tri-state preference, applies the effective theme on mount and on
 * every change, and registers a single `matchMedia` subscription that re-applies
 * the theme only while the stored preference is `system` (manual Light/Dark
 * ignore OS changes). The subscription reads `readStoredTheme()` inside the
 * listener so it always observes the latest preference without re-subscribing.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Theme,
  readStoredTheme,
  persistTheme,
  resolveTheme,
  prefersDark,
  applyTheme,
  subscribeSystem,
} from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

/** Provides the theme preference and a persisting setter to the React tree. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Apply on mount and whenever the preference changes.
  useEffect(() => {
    applyTheme(resolveTheme(theme, prefersDark()));
  }, [theme]);

  // Subscribe once; re-apply on OS change only while the preference is `system`.
  useEffect(
    () =>
      subscribeSystem(() => {
        if (readStoredTheme() === 'system') {
          applyTheme(resolveTheme('system', prefersDark()));
        }
      }),
    []
  );

  const setTheme = (t: Theme) => {
    persistTheme(t);
    setThemeState(t);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

/** Read the active theme preference and its setter; throws outside the provider. */
export function useTheme(): ThemeContextValue {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
