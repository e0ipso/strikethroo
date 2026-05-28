/**
 * Plan Detail — Board body (the `/plans/:id` Tasks tab content).
 *
 * Presents the plan's tasks as todo / doing / done columns of cards with a
 * snapshot scrubber and a "Live" control, ported from the design's
 * `PlanDetailBoard` (`scratch/ui/designs/screens-detail.jsx`). It is mounted by
 * `PlanDetailRoute`, which owns the shared `Chrome`; this component renders only
 * the scrubber + board body and reuses the vendored `.snap*`, `.taskboard`,
 * `.col*`, and `.tcard*` classes (Plan 88, Task 001).
 *
 * Data honesty (the defining constraint of this plan): the design hardcodes a
 * three-step `start` / `midPhase` / `current` snapshot history. The live
 * workspace records NO task-status history, so this view exposes only two
 * honestly representable snapshots —
 *   - `current`: every task at its real status from the model, and
 *   - `start`:   every task forced to `todo` (deterministically derivable, since
 *                every task begins `todo`).
 * It never synthesizes the design's intermediate all-`doing` `midPhase` state,
 * and the scrubber explicitly states that intermediate progress history is not
 * tracked. "Live" returns to `current`, which is also the default selection, so
 * a real `done` plan shows its tasks in the Done column on first paint.
 */

import { useMemo, useState } from 'react';
import type { PlanDetail, Task } from '../../data/api';
import { StatusPill, Button } from '../../components/primitives';
import { toTickboxState } from '../taskStatus';

/** The two honestly representable snapshots; no fabricated intermediate state. */
type SnapshotKey = 'start' | 'current';

/** The three board columns, in display order. */
const COLUMNS: readonly ['todo', 'doing', 'done'] = ['todo', 'doing', 'done'];

/** Two-digit, zero-padded task id (`task · 01`). */
const padId = (id: number): string => String(id).padStart(2, '0');

/**
 * Maps each task id to its 1-based phase number (`P{n}`) from the model's phase
 * grouping. Tasks not present in any phase get no tag.
 */
function buildPhaseTags(detail: PlanDetail): Map<number, number> {
  const tags = new Map<number, number>();
  for (const phase of detail.phases) {
    for (const taskId of phase.taskIds) {
      if (!tags.has(taskId)) tags.set(taskId, phase.index);
    }
  }
  return tags;
}

/**
 * The effective `todo|doing|done` state of a task under the selected snapshot.
 * Under `start` every task is `todo`; under `current` we map the real status.
 */
function stateUnderSnapshot(task: Task, snapshot: SnapshotKey): 'todo' | 'doing' | 'done' {
  if (snapshot === 'start') return 'todo';
  return toTickboxState(task.status);
}

/** A single task card. */
function TaskCard({ task, phaseTag }: { task: Task; phaseTag?: number }) {
  const deps = task.dependencies ?? [];
  return (
    <div className="tcard">
      <div className="tcard__head">
        <span className="tcard__id">task · {padId(task.id)}</span>
        {phaseTag != null && <span className="tcard__phase">P{phaseTag}</span>}
      </div>
      <div className="tcard__title">{task.name}</div>
      <div className="tcard__meta">
        {task.group && (
          <span>
            group · <strong>{task.group}</strong>
          </span>
        )}
        <span>deps · {deps.length === 0 ? 'none' : deps.map(padId).join(', ')}</span>
      </div>
    </div>
  );
}

/** The Board body: snapshot scrubber + three status columns of task cards. */
export function PlanDetailBoard({ detail }: { detail: PlanDetail }) {
  const [snapshot, setSnapshot] = useState<SnapshotKey>('current');
  const phaseTags = useMemo(() => buildPhaseTags(detail), [detail]);

  // Partition tasks into the three columns under the active snapshot.
  const columns = useMemo(() => {
    const buckets: Record<'todo' | 'doing' | 'done', Task[]> = { todo: [], doing: [], done: [] };
    for (const task of detail.tasks) {
      buckets[stateUnderSnapshot(task, snapshot)].push(task);
    }
    return buckets;
  }, [detail.tasks, snapshot]);

  return (
    <>
      <div className="snap">
        <span className="snap__label">Snapshot</span>
        <div className="snap__seg">
          <div
            className={`snap__btn${snapshot === 'start' ? ' snap__btn--active' : ''}`}
            onClick={() => setSnapshot('start')}
          >
            <div>Start</div>
            <div className="snap__btn-meta">all tasks todo</div>
          </div>
          <div
            className={`snap__btn${snapshot === 'current' ? ' snap__btn--active' : ''}`}
            onClick={() => setSnapshot('current')}
          >
            <div>Current</div>
            <div className="snap__btn-meta">live task statuses</div>
          </div>
        </div>
        <Button kind="ghost" size="sm" onClick={() => setSnapshot('current')}>
          Live
        </Button>
      </div>

      <p className="col__hint" style={{ padding: '0 28px 6px' }}>
        The workspace records only the current task statuses; intermediate
        progress history (which tasks were mid-flight when) is not tracked, so no
        in-between snapshot is shown.
      </p>

      <div className="taskboard">
        {COLUMNS.map(state => {
          const tasks = columns[state];
          return (
            <div key={state} className="col">
              <div className="col__head">
                <StatusPill kind={state} />
                <span className="col__count">{tasks.length}</span>
              </div>
              <div className="col__body">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} phaseTag={phaseTags.get(task.id)} />
                ))}
                {tasks.length === 0 && <div className="col__empty">empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
