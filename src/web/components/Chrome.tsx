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
    <div className="chrome" style={tabs ? undefined : { paddingBottom: 18 }}>
      <div className="chrome__top">
        <div>
          {crumbs && (
            <div className="chrome__crumb">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                const label = typeof c === 'string' ? c : c.label;
                const href = typeof c === 'string' ? undefined : c.href;
                return (
                  <Fragment key={i}>
                    {i > 0 && <span className="sep">/</span>}
                    {href != null && !isLast ? (
                      <span
                        className="seg"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(href)}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className={`seg${isLast ? ' seg--cur' : ''}`}>{label}</span>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
          <h1 className="chrome__title" style={titleStyle}>
            {title}
          </h1>
        </div>
        {right != null && <div className="chrome__actions">{right}</div>}
      </div>
      {tabs && (
        <div className="chrome__tabs">
          {tabs.map((t, i) => {
            const [label, count] = Array.isArray(t) ? t : [t, null];
            return (
              <div
                key={i}
                className={`tab${i === activeTab ? ' tab--active' : ''}`}
                onClick={onTabSelect ? () => onTabSelect(i) : undefined}
                style={onTabSelect ? { cursor: 'default' } : undefined}
              >
                {label}
                {count != null && <span className="tab__count">{count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
