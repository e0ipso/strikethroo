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
import { cn } from '../vendor/utils/cn';
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
  state === 'done'
    ? 'var(--color-done)'
    : state === 'doing'
      ? 'var(--color-doing)'
      : 'var(--color-ink-3)';

export interface PlansKanbanViewProps {
  plans: PlanView[];
  /** Opens the Review command-hint modal for the given plan path. */
  openReview: (path: string) => void;
  /** Opens the archive-confirmation modal for a done plan. */
  openArchive: (id: number, title: string) => void;
}

/** The Board (Kanban) view of the active plans. */
export function PlansKanbanView({ plans, openReview, openArchive }: PlansKanbanViewProps) {
  const navigate = useNavigate();
  const [showDone, setShowDone] = useState(false);

  const groups = groupByState(plans);
  const cols = COLUMNS.filter(c => !c.toggle || showDone);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border-soft bg-cream px-7 py-2.5 text-sm text-ink-3">
        <div className="inline-flex items-center gap-2">
          <span className="font-sans text-xs font-semibold uppercase text-dalia-dark">Columns</span>
          <span
            className="inline-flex cursor-pointer items-center gap-1.5"
            onClick={() => setShowDone(s => !s)}
          >
            <Tickbox state={showDone ? 'done' : 'todo'} />
            <span className={cn(showDone ? 'font-medium text-ink' : 'font-normal text-ink-3')}>
              {showDone ? 'Hide done' : 'Show done'}
            </span>
          </span>
        </div>
        <div className="ml-auto italic text-ink-3">
          completed plans move to the Archive tab automatically once every task is done
        </div>
      </div>

      <div
        data-testid="board"
        className="grid flex-1 items-stretch content-stretch gap-4 overflow-hidden px-6 py-4"
        style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}
      >
        {cols.map(col => {
          const items = groups[col.state];
          return (
            <div
              key={col.state}
              data-testid="board-column"
              className="flex min-h-0 flex-col rounded-lg border border-border-soft bg-cream-mid"
            >
              <div className="flex items-center justify-between border-b border-border-soft px-3 pt-3 pb-2.5">
                <div className="flex items-center gap-2">
                  <StatusPill kind={col.state as StatusKind} label={col.title} />
                </div>
                <span className="font-mono text-sm text-ink-3">{items.length}</span>
              </div>
              <div className="px-3 py-2 font-mono text-xs text-ink-3">{col.hint}</div>
              <div className="flex flex-col gap-2.5 overflow-y-auto p-2.5">
                {items.map(p => (
                  <div
                    key={p.id}
                    data-testid="board-card"
                    className={cn(
                      'cursor-pointer rounded-card px-3 py-2.5',
                      p.state === 'drafted'
                        ? 'border border-dashed border-ink-3 bg-transparent'
                        : 'bg-cream shadow-sm ring-1 ring-border-soft'
                    )}
                    onClick={() => navigate(`/plans/${p.id}`)}
                  >
                    <div className="flex justify-between gap-1.5">
                      <span className="font-mono text-sm text-ink-3">#{p.id}</span>
                    </div>
                    <div className="mt-px mb-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-base font-semibold text-ink">
                      {p.title}
                    </div>
                    <div className="text-sm text-ink-2">{p.summary}</div>
                    {p.total != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/5">
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPct(p.done, p.total)}%`,
                              background: barColor(p.state),
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs text-ink-3">
                          {p.done}/{p.total}
                        </span>
                      </div>
                    )}
                    {p.state === 'drafted' && (
                      <div className="mt-2.5">
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
                    {p.state === 'done' && (
                      <div className="mt-2.5">
                        <span
                          onClick={e => {
                            e.stopPropagation();
                            openArchive(p.id, p.title);
                          }}
                        >
                          <Button kind="outline" size="sm" icon="archive">
                            Archive
                          </Button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="m-1 flex min-h-20 flex-1 items-center justify-center rounded-card border border-dashed border-border bg-black/5 font-mono text-xs text-ink-4">
                    empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
