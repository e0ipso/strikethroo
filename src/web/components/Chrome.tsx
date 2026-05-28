/**
 * Top chrome bar — ported from the design's app-kit.jsx (Chrome, lines
 * 116–148). Renders optional breadcrumbs, the section title, an optional
 * right-aligned action area, and an optional tab strip with per-tab counts.
 *
 * Presentation-only: it takes typed props and emits the canonical class
 * names. Per-screen tickets supply crumbs/tabs/actions; this ticket only
 * provides the component.
 */

import { Fragment, type ReactNode } from 'react';

/** A tab is either a bare label or a `[label, count]` pair. */
export type ChromeTab = string | [string, number];

export interface ChromeProps {
  title: ReactNode;
  crumbs?: string[];
  tabs?: ChromeTab[];
  activeTab?: number;
  right?: ReactNode;
  /**
   * Optional tab-click handler. When provided, tabs become interactive (used
   * by the Plans section to switch List / Cards / Board in place). When
   * omitted, tabs stay purely presentational.
   */
  onTabSelect?: (index: number) => void;
}

/** The top bar: breadcrumbs, title, actions, and an optional tab strip. */
export function Chrome({ title, crumbs, tabs, activeTab = 0, right, onTabSelect }: ChromeProps) {
  return (
    <div className="chrome">
      <div className="chrome__top">
        <div>
          {crumbs && (
            <div className="chrome__crumb">
              {crumbs.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="sep">/</span>}
                  <span className={`seg${i === crumbs.length - 1 ? ' seg--cur' : ''}`}>{c}</span>
                </Fragment>
              ))}
            </div>
          )}
          <h1 className="chrome__title">{title}</h1>
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
