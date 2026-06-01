/**
 * Presentational tri-state theme switcher (Light / Dark / System).
 *
 * A segmented control wired to `useTheme`: each segment is a real `<button>`
 * (natively keyboard-operable), marks the active preference, and carries an
 * `aria-label` plus `aria-pressed`. The fixed `Icon` set carries no
 * sun/moon/monitor glyphs, so segments use text labels per the task's guidance
 * (do not invent unregistered icon names). Emits canonical `.theme-seg` classes.
 */

import { useTheme } from './ThemeProvider';
import type { Theme } from './theme';

interface Segment {
  value: Theme;
  label: string;
}

const SEGMENTS: Segment[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** The Sidebar-footer segmented control for the theme preference. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-seg" role="group" aria-label="Theme">
      {SEGMENTS.map(seg => {
        const active = theme === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            className={`theme-seg__btn${active ? ' theme-seg__btn--active' : ''}`}
            aria-label={`${seg.label} theme`}
            aria-pressed={active}
            onClick={() => setTheme(seg.value)}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
