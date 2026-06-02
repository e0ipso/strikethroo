/**
 * Top chrome bar — ported from the design's app-kit.jsx (Chrome, lines
 * 116–148). Renders optional breadcrumbs, the section title, an optional
 * right-aligned action area, and an optional tab strip with per-tab counts.
 *
 * Presentation-only: it takes typed props and emits the canonical class
 * names. Per-screen tickets supply crumbs/tabs/actions; this ticket only
 * provides the component.
 */

import { Fragment, type CSSProperties, type ReactNode } from 'react';

import { cn } from '../vendor/utils/cn';
import { useNavigate } from '../router';

/** A tab is either a bare label or a `[label, count]` pair. */
export type ChromeTab = string | [string, number];

/**
 * A breadcrumb is either a bare label (non-navigable) or a `{ label, href }`
 * pair that navigates to a real route on click. The current/last crumb always
 * renders as inert text even when it carries an `href`.
 */
export type Crumb = string | { label: string; href: string };

export interface ChromeProps {
  title: ReactNode;
  crumbs?: Crumb[];
  tabs?: ChromeTab[];
  activeTab?: number;
  right?: ReactNode;
  /**
   * Optional tab-click handler. When provided, tabs become interactive (used
   * by the Plans section to switch List / Cards / Board in place). When
   * omitted, tabs stay purely presentational.
   */
  onTabSelect?: (index: number) => void;
  /** Optional inline style merged onto the title `h1` (e.g. extra top padding). */
  titleStyle?: CSSProperties;
}

/** The top bar: breadcrumbs, title, actions, and an optional tab strip. */
export function Chrome({
  title,
  crumbs,
  tabs,
  activeTab = 0,
  right,
  onTabSelect,
  titleStyle,
}: ChromeProps) {
  const navigate = useNavigate();
  return (
    // Without a tab strip the chrome content would sit flush on the bottom
    // border (the design's `.chrome` has zero bottom padding because tabs
    // normally provide that gap). Restore symmetric spacing when tabless.
    <div
      className="border-b border-border px-7 pt-5"
      style={tabs ? undefined : { paddingBottom: 18 }}
    >
      <div className="flex items-end justify-between gap-5">
        <div>
          {crumbs && (
            <nav
              aria-label="Breadcrumb"
              data-testid="breadcrumbs"
              className="mb-1 font-mono text-xs text-ink-3"
            >
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                const label = typeof c === 'string' ? c : c.label;
                const href = typeof c === 'string' ? undefined : c.href;
                return (
                  <Fragment key={i}>
                    {i > 0 && <span className="mx-1.5 text-ink-4">/</span>}
                    {href != null && !isLast ? (
                      <span
                        className="text-ink-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(href)}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className={cn(isLast ? 'font-medium text-ink-2' : 'text-ink-3')}>
                        {label}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </nav>
          )}
          <h1
            className="m-0 font-display text-4xl font-bold leading-tight text-ink [font-variation-settings:'opsz'_36]"
            style={titleStyle}
          >
            {title}
          </h1>
        </div>
        {right != null && (
          <div data-testid="chrome-actions" className="flex items-center gap-2">
            {right}
          </div>
        )}
      </div>
      {tabs && (
        <div role="tablist" className="-mb-px mt-3.5 flex gap-0.5">
          {tabs.map((t, i) => {
            const [label, count] = Array.isArray(t) ? t : [t, null];
            const tabActive = i === activeTab;
            return (
              <div
                key={i}
                role="tab"
                aria-selected={tabActive}
                className={cn(
                  'relative cursor-pointer px-3.5 pt-2 pb-3 text-base font-medium',
                  tabActive
                    ? "font-semibold text-ink after:absolute after:-bottom-px after:left-1.5 after:right-1.5 after:h-0.5 after:rounded-sm after:bg-ink after:content-['']"
                    : 'text-ink-3 hover:text-ink-2'
                )}
                onClick={onTabSelect ? () => onTabSelect(i) : undefined}
                style={onTabSelect ? { cursor: 'default' } : undefined}
              >
                {label}
                {count != null && (
                  <span className="ml-1.5 font-mono text-xs font-medium text-ink-4">{count}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
