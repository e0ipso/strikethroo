/**
 * Plans List view (Plan 86, Task 002).
 *
 * Ports the design's `PlansListView` table onto the vendored `tbl` classes and
 * the Task 001 derived data. Renders the dense CSS-grid table (id, plan, state,
 * tasks, created, action), the sub-bar, and the bottom status bar — with the
 * status-bar copy rewritten to the strikethroo workspace path and archive
 * guidance (the design's `.ai/task-manager/` root and `plan archive <id>`
 * command are gone). View switching and the Chrome live in the Task 006 route
 * container; this component renders only the List content inside `main`.
 */

import { Button, Icon, StatusPill, Tickbox } from '../components/primitives';
import { useNavigate } from '../router';
import { progressLabel, progressPct, planMdPath, type PlanView } from './derive';

/** Grid column template ported verbatim from the design. */
const COL_TPL = '36px 1fr 130px 150px 110px 120px';

/** Status-bar copy — strikethroo workspace path and archive guidance (no legacy strings). */
const WORKSPACE_PATH = '.ai/strikethroo/';

/** Resolves the progress fill color for a plan's derived state. */
const fillFor = (state: PlanView['state']): string =>
  state === 'done' ? 'var(--done)' : state === 'doing' ? 'var(--doing)' : 'var(--ink-4)';

export interface PlansListViewProps {
  plans: PlanView[];
  /** Opens the Review command-hint modal for the given plan path. */
  openReview: (path: string) => void;
  /** Opens the archive-confirmation modal for a done plan. */
  openArchive: (id: number, title: string) => void;
}

/** The List (table) view of the active plans. */
export function PlansListView({ plans, openReview, openArchive }: PlansListViewProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="subbar">
        <div className="subbar__group">
          <span className="label" style={{ fontSize: 10 }}>
            Show
          </span>
          <span className="subbar__seg">
            <Tickbox state="done" /> Done
          </span>
          <span className="subbar__seg" style={{ color: 'var(--ink-2)' }}>
            <Tickbox state="done" /> All states
          </span>
        </div>
        <div className="subbar__sep" />
        <div className="subbar__group" style={{ color: 'var(--ink-3)' }}>
          <Icon name="sort" size={13} />
          sort: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>id ↓</span>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {plans.length} active plans
        </div>
      </div>

      <div className="scroll">
        <div className="tbl tbl--head" style={{ gridTemplateColumns: COL_TPL }}>
          <span>id</span>
          <span>plan</span>
          <span>state</span>
          <span>tasks</span>
          <span>created</span>
          <span />
        </div>
        {plans.map(row => {
          const pct = progressPct(row.done, row.total);
          return (
            <div
              key={row.id}
              className="tbl tbl--row"
              style={{ gridTemplateColumns: COL_TPL }}
              onClick={() => navigate(`/plans/${row.id}`)}
            >
              <span className="tbl__id">{row.id}</span>
              <div className="tbl__title">
                <div className="tbl__title-slug">{row.title}</div>
                <div className="tbl__title-summary">{row.summary}</div>
              </div>
              <StatusPill kind={row.state} />
              <div className="tbl__bar">
                <span style={{ width: 38 }}>{progressLabel(row.done, row.total)}</span>
                {row.total != null && (
                  <div className="tbl__bar-track">
                    <div
                      className="tbl__bar-fill"
                      style={{ width: `${pct}%`, background: fillFor(row.state) }}
                    />
                  </div>
                )}
              </div>
              <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                {row.created}
              </span>
              <div style={{ textAlign: 'right' }}>
                {row.state === 'drafted' && (
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      openReview(planMdPath(row));
                    }}
                  >
                    <Button kind="outline" size="sm" icon="review">
                      Review
                    </Button>
                  </span>
                )}
                {row.state === 'done' && (
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      openArchive(row.id, row.title);
                    }}
                  >
                    <Button kind="outline" size="sm" icon="archive">
                      Archive
                    </Button>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="statusbar">
        <span>
          workspace · <strong>{WORKSPACE_PATH}</strong>
        </span>
        <span>
          completed plans move to <strong>Archive</strong> automatically when every task is done
        </span>
      </div>
    </>
  );
}
