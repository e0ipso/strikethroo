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
 * Compact brand mark shown when the rail is collapsed: the struck-through
 * lowercase "s" from `public/favicon.svg`, redrawn in `currentColor` (instead
 * of the favicon's baked cream/ink hex) so it inherits the sidebar's `--ink`
 * and adapts to light/dark. No background tile — it sits on the rail surface.
 */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="sb__mark"
      style={{ width: size, height: size }}
      role="img"
      aria-label="strikethroo"
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          transform="translate(50,50) scale(0.11,-0.11) translate(-208,-237.5)"
          fill="currentColor"
          d="M217 -10Q177 -10 141 0.5Q105 11 75.5 30.5Q46 50 24 77L82 135Q108 103 142 87.5Q176 72 218 72Q260 72 283 86.5Q306 101 306 127Q306 153 287.5 167.5Q269 182 240 191.5Q211 201 178.5 210Q146 219 117 234Q88 249 69.5 275.5Q51 302 51 345Q51 388 71.5 419.5Q92 451 130 468Q168 485 221 485Q277 485 320.5 465.5Q364 446 392 407L334 349Q313 375 284 389Q255 403 218 403Q179 403 158.5 389Q138 375 138 352Q138 328 156 315Q174 302 203.5 293Q233 284 265 274.5Q297 265 326 249Q355 233 373.5 206Q392 179 392 135Q392 68 344.5 29Q297 -10 217 -10Z"
        />
        <rect x="22" y="43" width="56" height="6.5" rx="3.25" fill="currentColor" />
      </svg>
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
