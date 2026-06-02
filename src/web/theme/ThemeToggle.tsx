/**
 * Presentational tri-state theme switcher (Light / Dark / System).
 *
 * A segmented control wired to `useTheme`: each segment is a real `<button>`
 * (natively keyboard-operable), marks the active preference, and carries an
 * `aria-label` plus `aria-pressed`. Each segment shows an icon (sun / moon /
 * monitor) with the human label exposed as native hover/focus tooltip text via
 * `title`. Emits canonical `.theme-seg` classes.
 */

import { Icon, type IconName } from '../components/primitives';
import { useTheme } from './ThemeProvider';
import type { Theme } from './theme';

interface Segment {
  value: Theme;
  label: string;
  icon: IconName;
}

const SEGMENTS: Segment[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
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
            title={`${seg.label} theme`}
            onClick={() => setTheme(seg.value)}
          >
            <Icon name={seg.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
