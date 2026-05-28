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

import { Icon, type IconName } from './primitives';
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
}

/** The workspace sidebar: brand, nav destinations, and footer. */
export function Sidebar({ counts = {} }: SidebarProps) {
  const route = useRoute();
  const navigate = useNavigate();
  const active = activeLabelFor(route.section);

  return (
    <aside className="sb">
      <div className="sb__brand">
        <span className="tl-mark">strikethroo</span>
        <span className="sb__brand-sub">v0.4</span>
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
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label}</span>
              {count != null && <span className="sb__count">{count}</span>}
            </div>
          );
        })}
      </nav>
      <div className="sb__foot">
        <strong>.ai/strikethroo/</strong>
      </div>
    </aside>
  );
}
