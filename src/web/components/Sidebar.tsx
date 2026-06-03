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
import { useCapabilities } from '../data/api';
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
      className="inline-block text-ink [&_img]:block [&_svg]:block"
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

  // The hosting project's identity (folder containing `.ai/strikethroo`).
  // Falls back to the workspace path until capabilities resolve.
  const caps = useCapabilities();
  const project = caps.status === 'data' ? caps.data.project : undefined;

  const collapseToggle = (
    <Toggle
      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-ink-3 hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
      pressed={collapsed}
      onPressedChange={next => onCollapsedChange?.(next)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {/* Chevron points "left" (toward the edge) when expanded — i.e. "collapse";
         outward when collapsed. Rotation rides the Icon's style so it does not
         depend on the `.icon` class surviving the primitives migration. */}
      <Icon
        name="chevron"
        size={16}
        style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }}
      />
    </Toggle>
  );

  return (
    // Pinned to the viewport (sticky + h-screen + self-start) so the footer and
    // ThemeToggle stay visible regardless of how tall the main content grows —
    // a recorded project practice. `self-start` opts out of the grid stretch so
    // `h-screen` (not the row height) governs where the footer sits.
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-cream-mid pt-5 pb-4',
        collapsed ? 'w-16 items-center px-2.5' : 'w-64 px-3.5'
      )}
    >
      <div
        className={cn(
          'flex items-baseline gap-2 pb-5 font-sans text-2xl font-normal text-ink',
          collapsed ? 'justify-center' : 'px-1.5'
        )}
      >
        {collapsed ? (
          <BrandMark />
        ) : (
          <>
            {/* THROUGHLINE WORDMARK — deliberate exception to the utility-first
               Tailwind convention. The strikethrough must pierce the lowercase
               x-height midline (~0.631em down with leading-none), NOT the em-box
               center (top-1/2), or it floats above the `o`s. The em-based line
               position/thickness/tracking are the exact values from the original
               `.tl-mark` rule; keep them as arbitrary values — do not "simplify"
               back to top-1/2 / h-px. */}
            <span className="relative inline-block font-sans font-normal leading-none tracking-[-0.015em] after:pointer-events-none after:absolute after:inset-x-0 after:top-[0.631em] after:h-[0.058em] after:-translate-y-1/2 after:bg-current after:content-['']">
              strikethroo
            </span>
            <span className="ml-1 font-mono text-xs font-medium uppercase text-ink-3">
              v{__APP_VERSION__}
            </span>
          </>
        )}
      </div>
      {!collapsed && (
        <div className="px-2.5 pt-3 pb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-ink-3">
          Workspace
        </div>
      )}
      <nav className={cn('flex flex-col gap-px', collapsed && 'items-center')}>
        {NAV_ITEMS.map(it => {
          const count = counts[it.label];
          const isActive = it.label === active;
          return (
            <div
              key={it.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex cursor-pointer items-center rounded-md text-base font-medium hover:bg-black/5 hover:text-ink dark:hover:bg-white/10',
                collapsed ? 'w-9 justify-center p-2' : 'gap-2.5 px-2.5 py-2',
                isActive
                  ? cn(
                      "bg-cream text-ink shadow-sm ring-1 ring-border-soft before:absolute before:top-2 before:bottom-2 before:w-0.5 before:rounded-sm before:bg-dalia before:content-['']",
                      collapsed ? 'before:-left-2.5' : 'before:-left-3.5'
                    )
                  : 'text-ink-2'
              )}
              onClick={() => navigate(it.path)}
              title={collapsed ? it.label : undefined}
            >
              <Icon name={it.icon} size={15} />
              {!collapsed && <span>{it.label}</span>}
              {!collapsed && count != null && (
                <span className="ml-auto font-mono text-xs text-ink-3">{count}</span>
              )}
            </div>
          );
        })}
      </nav>
      <div
        className={cn(
          'mt-auto font-mono text-xs leading-normal text-ink-3',
          collapsed ? 'flex justify-center' : 'border-t border-border-soft px-2.5 pt-3'
        )}
      >
        {collapsed ? (
          collapseToggle
        ) : (
          <>
            <strong
              data-testid="project-name"
              className="mb-2.5 block cursor-default overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-ink-2"
              title={project?.path ?? undefined}
            >
              {project?.name ?? '.ai/strikethroo/'}
            </strong>
            <div className="flex items-center justify-between gap-2">
              <ThemeToggle />
              {collapseToggle}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
