/**
 * Execution blueprint — Swimlanes view (Plan 89, Task 02).
 *
 * A faithful, read-only port of the design's `ExecSwimlanesView`
 * (`scratch/ui/designs/screens-exec.jsx`) onto the vendored Dalia exec/phase/
 * lane-task classes and the shared primitives. It renders ONLY the `.exec`
 * subtree (summary header + first-class phase containers); the surrounding
 * shell, Chrome, and the view-mode toggle belong to the Execute-tab container
 * (Task 04).
 *
 * Each phase is a first-class container: parallel phases lay their task cards
 * out side by side (`gridTemplateColumns: repeat(n, 1fr)`), sequential phases
 * stack them in a single column. All derived values come from the Task 01
 * helpers (`phaseStateOf`, `tally`) so the Swimlanes and Outline views never
 * drift. The component performs no fetch and no mutation.
 *
 * Model adaptation: the live `/api/plans/:id` payload exposes `phase.index`
 * (1-based), an optional `phase.name`, `phase.taskIds`, and `phase.parallel`;
 * it does NOT carry a per-phase title or commit count. The phase label falls
 * back to `Phase N` when no name is present, and the commit meta segment is
 * omitted entirely (rendered only if the model ever supplies it).
 */

import { StatusPill, Icon } from '../../components/primitives';
import type { Phase, PlanDetail, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';
import { stripIdPrefix, humanizeSlug } from '../derive';
import { phaseStateOf, tally, tasksById } from './derive';

/** Two-digit, zero-padded number (`01`, `12`). */
const pad = (n: number): string => String(n).padStart(2, '0');

/** The human-facing label for a phase (its name, or a `Phase N` fallback). */
const phaseLabel = (phase: Phase): string => phase.name?.trim() || `Phase ${phase.index}`;

/** A single lane task card within a phase grid. */
function LaneTask({ task }: { task: Task }) {
  const state = toTickboxState(task.status);
  const deps = task.dependencies ?? [];
  return (
    <div className={`lane-task lane-task--${state}`}>
      <div className="lane-task__head">
        <span className="lane-task__id">task · {pad(task.id)}</span>
      </div>
      <div className="lane-task__title">{task.name}</div>
      <div className="lane-task__meta">
        {task.group && (
          <span>
            group · <strong>{task.group}</strong>
          </span>
        )}
        <span>deps · {deps.length === 0 ? 'none' : deps.map(pad).join(', ')}</span>
      </div>
    </div>
  );
}

/** A single phase block: head (number, title, state, parallelism) + task grid. */
function PhaseBlock({ phase, byId }: { phase: Phase; byId: Map<number, Task> }) {
  const state = phaseStateOf(phase, byId);
  const phaseTasks = phase.taskIds.map(id => byId.get(id)).filter((t): t is Task => t != null);

  return (
    <div className="phase">
      <div className="phase__head">
        <span className="phase__num">{pad(phase.index)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="phase__title">{phaseLabel(phase)}</div>
          <div className="phase__meta" style={{ marginTop: 4 }}>
            <StatusPill kind={state} />
            <span>
              <Icon
                name={phase.parallel ? 'parallel' : 'arrow'}
                size={12}
                style={{ marginRight: 4, color: 'var(--ink-3)' }}
              />
              {phase.parallel ? 'parallel' : 'sequential'} · {phase.taskIds.length} tasks
            </span>
          </div>
        </div>
      </div>

      <div
        className="phase__tasks"
        style={{
          gridTemplateColumns: phase.parallel ? `repeat(${phase.taskIds.length}, 1fr)` : '1fr',
        }}
      >
        {phaseTasks.map(task => (
          <LaneTask key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

/** The Swimlanes view: summary header + one phase container per phase. */
export function ExecSwimlanesView({ detail }: { detail: PlanDetail }) {
  const byId = tasksById(detail.tasks);
  const counts = tally(detail.tasks);
  const phaseWord = detail.phases.length === 1 ? 'phase' : 'phases';
  const taskWord = counts.total === 1 ? 'task' : 'tasks';
  const planTitle = humanizeSlug(stripIdPrefix(detail.name));

  return (
    <div className="exec">
      <div className="exec__summary">
        <div>
          <div className="label" style={{ marginBottom: 2 }}>
            {planTitle}
          </div>
          <div className="exec__sum-title">
            {detail.phases.length} {phaseWord} · {counts.total} {taskWord}
          </div>
        </div>
        <div className="exec__sum-meta">
          <strong style={{ color: 'var(--done)' }}>{counts.done} done</strong>
          <span style={{ margin: '0 8px' }}>·</span>
          {counts.doing} doing
          <span style={{ margin: '0 8px' }}>·</span>
          {counts.todo} todo
        </div>
      </div>

      {detail.phases.map(phase => (
        <PhaseBlock key={phase.index} phase={phase} byId={byId} />
      ))}
    </div>
  );
}
