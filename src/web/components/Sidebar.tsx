/**
 * Persistent left sidebar — ported from the design's app-kit.jsx (Sidebar,
 * lines 86–113) with the rebrand corrections the plan mandates:
 *   - the brand wordmark reads `strikethroo`,
 *   - the footer reads `.ai/strikethroo/` (correcting the design's stale
 *     pre-rebrand workspace path).
 *
 * The active destination derives from the current route via `useRoute`; nav
 * items navigate via `useNavigate`. Presentation-only beyond that wiring.
 */

import { Toggle } from '@base-ui-components/react/toggle';
import { Icon, type IconName } from './primitives';
import { cn } from '../vendor/utils/cn';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useNavigate, useRoute, type RouteSection } from '../router';

interface NavItem {
  label: 'Plans' | 'Archive' | 'Customize';
  icon: IconName;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Plans', icon: 'plans', path: '/' },
  { label: 'Archive', icon: 'archive', path: '/archive' },
  { label: 'Customize', icon: 'settings', path: '/customize' },
];

/**
 * Compact brand mark shown when the rail is collapsed: the app favicon
 * (`public/favicon.svg`, served at `/favicon.svg`) rendered as-is, so the
 * collapsed rail shows the exact same struck-"s" tile logo as the browser tab.
 */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="sb__mark"
      style={{ width: size, height: size }}
      role="img"
      aria-label="strikethroo"
    >
      <img src="/favicon.svg" width={size} height={size} alt="" />
    </span>
  );
}

/** Maps the active route section to the nav item label that should highlight. */
function activeLabelFor(section: RouteSection): NavItem['label'] {
  switch (section) {
    case 'plans':
    case 'planDetail':
      return 'Plans';
    case 'archive':
      return 'Archive';
    case 'customize':
      return 'Customize';
  }
}

export interface SidebarProps {
  /** Optional per-destination counts, keyed by nav label. */
  counts?: Partial<Record<NavItem['label'], number>>;
  /** Whether the rail is collapsed to an icon-only bar. */
  collapsed?: boolean;
  /** Called with the next collapsed state when the collapse toggle fires. */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/** The workspace sidebar: brand, nav destinations, and footer. */
export function Sidebar({ counts = {}, collapsed = false, onCollapsedChange }: SidebarProps) {
  const route = useRoute();
  const navigate = useNavigate();
  const active = activeLabelFor(route.section);

  const collapseToggle = (
    <Toggle
      className="sb__collapse"
      pressed={collapsed}
      onPressedChange={next => onCollapsedChange?.(next)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <Icon name="chevron" size={16} />
    </Toggle>
  );

  return (
    <aside className={cn('sb', collapsed && 'sb--collapsed')}>
      <div className="sb__brand">
        {collapsed ? (
          <BrandMark />
        ) : (
          <>
            <span className="tl-mark">strikethroo</span>
            <span className="sb__brand-sub">v{__APP_VERSION__}</span>
          </>
        )}
      </div>
      <div className="sb__group">Workspace</div>
      <nav className="sb__nav">
        {NAV_ITEMS.map(it => {
          const count = counts[it.label];
          return (
            <div
              key={it.label}
              className={`sb__item${it.label === active ? ' sb__item--active' : ''}`}
              onClick={() => navigate(it.path)}
              title={collapsed ? it.label : undefined}
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label}</span>
              {count != null && <span className="sb__count">{count}</span>}
            </div>
          );
        })}
      </nav>
      <div className="sb__foot">
        {collapsed ? (
          collapseToggle
        ) : (
          <>
            <ThemeToggle />
            <div className="sb__foot-row">
              <strong>.ai/strikethroo/</strong>
              {collapseToggle}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
