/**
 * Plans Board (Kanban) view (Plan 86, Task 004).
 *
 * Ports the design's `PlansKanbanView` four-column board onto the vendored
 * `board`/`col`/`bcard` classes and the Task 001 `groupByState` grouping.
 * Columns: Drafted / Tasks ready / Doing / Done, each with a StatusPill header,
 * count, hint line, and per-card mini progress bar; drafted cards carry a
 * Review action. A local "Show done" Tickbox toggles the Done column (no
 * persistence, no API change). The sub-bar hint is rewritten to strikethroo
 * archive guidance (the design's `plan archive <id>` command is gone). View
 * switching / Chrome belong to the Task 006 route container.
 */

import { useState } from 'react';
import { Button, StatusPill, Tickbox } from '../components/primitives';
import { useNavigate } from '../router';
import { groupByState, progressPct, planMdPath, type PlanView } from './derive';
import type { StatusKind } from '../components/primitives';

/** Static column config in board order. `toggle` marks the optional Done column. */
const COLUMNS: ReadonlyArray<{
  state: keyof ReturnType<typeof groupByState>;
  title: string;
  hint: string;
  toggle?: boolean;
}> = [
  { state: 'drafted', title: 'Drafted', hint: 'plan.md only' },
  { state: 'ready', title: 'Tasks ready', hint: 'plan + tasks/' },
  { state: 'doing', title: 'Doing', hint: '≥1 task started' },
  { state: 'done', title: 'Done', hint: 'all tasks complete', toggle: true },
];

/** Resolves a board card's mini-bar color for its state. */
const barColor = (state: PlanView['state']): string =>
  state === 'done' ? 'var(--done)' : state === 'doing' ? 'var(--doing)' : 'var(--ink-3)';

export interface PlansKanbanViewProps {
  plans: PlanView[];
  /** Opens the Review command-hint modal for the given plan path. */
  openReview: (path: string) => void;
}

/** The Board (Kanban) view of the active plans. */
export function PlansKanbanView({ plans, openReview }: PlansKanbanViewProps) {
  const navigate = useNavigate();
  const [showDone, setShowDone] = useState(true);

  const groups = groupByState(plans);
  const cols = COLUMNS.filter(c => !c.toggle || showDone);

  return (
    <>
      <div className="subbar">
        <div className="subbar__group">
          <span className="label" style={{ fontSize: 10 }}>
            Columns
          </span>
          <span
            className="subbar__seg"
            onClick={() => setShowDone(s => !s)}
            style={{ cursor: 'default' }}
          >
            <Tickbox state={showDone ? 'done' : 'todo'} />
            <span
              style={{
                color: showDone ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: showDone ? 500 : 400,
              }}
            >
              Show done {showDone ? '· visible' : '· hidden'}
            </span>
          </span>
        </div>
        <div style={{ marginLeft: 'auto', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          completed plans move to the Archive tab automatically once every task is done
        </div>
      </div>

      <div className="board" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map(col => {
          const items = groups[col.state];
          return (
            <div key={col.state} className="col">
              <div className="col__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusPill kind={col.state as StatusKind} label={col.title} />
                </div>
                <span className="col__count">{items.length}</span>
              </div>
              <div className="col__hint">{col.hint}</div>
              <div className="col__body">
                {items.map(p => (
                  <div
                    key={p.id}
                    className={`bcard${p.state === 'drafted' ? ' bcard--drafted' : ''}`}
                    onClick={() => navigate(`/plans/${p.id}`)}
                  >
                    <div className="bcard__head">
                      <span className="bcard__id">#{p.id}</span>
                    </div>
                    <div className="bcard__slug">{p.title}</div>
                    <div className="bcard__sum">{p.summary}</div>
                    {p.total != null && (
                      <div
                        style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            background: 'oklch(0 0 0 / 0.07)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPct(p.done, p.total)}%`,
                              background: barColor(p.state),
                            }}
                          />
                        </div>
                        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                          {p.done}/{p.total}
                        </span>
                      </div>
                    )}
                    {p.state === 'drafted' && (
                      <div style={{ marginTop: 10 }}>
                        <span
                          onClick={e => {
                            e.stopPropagation();
                            openReview(planMdPath(p));
                          }}
                        >
                          <Button kind="outline" size="sm" icon="review">
                            Review
                          </Button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && <div className="col__empty">empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
