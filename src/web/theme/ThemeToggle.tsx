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
import { cn } from '../vendor/utils/cn';
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
    <div
      className="flex flex-1 gap-0.5 rounded-lg bg-cream-mid p-0.5 ring-1 ring-inset ring-border-soft"
      role="group"
      aria-label="Theme"
    >
      {SEGMENTS.map(seg => {
        const active = theme === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center rounded-md border-0 px-1.5 py-1.5 font-mono text-xs font-medium',
              active ? 'bg-cream text-ink shadow-sm' : 'bg-transparent text-ink-3 hover:text-ink-2'
            )}
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
