/**
 * Execution blueprint — Swimlanes view (Plan 89, Task 02).
 *
 * A faithful, read-only port of the design's `ExecSwimlanesView`
 * (`scratch/ui/designs/screens-exec.jsx`) onto Tailwind utilities (Plan 102) and
 * the shared primitives. It renders ONLY the exec subtree (summary header +
 * first-class phase containers); the surrounding shell, Chrome, and the
 * view-mode toggle belong to the Execute-tab container. Lane-task cards are
 * de-checkboxed and clickable to Task Detail when the task has an id.
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
import { taskNavProps } from '../taskNav';
import { useNavigate } from '../../router';
import { cn } from '../../vendor/utils/cn';
import { stripIdPrefix, humanizeSlug } from '../derive';
import { phaseStateOf, tally, tasksById } from './derive';

/** Two-digit, zero-padded number (`01`, `12`). */
const pad = (n: number): string => String(n).padStart(2, '0');

/** The human-facing label for a phase (its name, or a `Phase N` fallback). */
const phaseLabel = (phase: Phase): string => phase.name?.trim() || `Phase ${phase.index}`;

/** Eyebrow label (the design's `.label` from base.css). */
const LABEL = 'font-sans text-sm font-semibold uppercase text-dalia-dark';

/**
 * A single lane task card within a phase grid — de-checkboxed; a done task reads
 * as a struck-through, muted title and a doing task as the doing accent colour;
 * clickable to Task Detail when the task has an id.
 */
function LaneTask({ planId, task }: { planId: string; task: Task }) {
  const navigate = useNavigate();
  const state = toTickboxState(task.status);
  const deps = task.dependencies ?? [];
  const nav = taskNavProps(planId, task.id, navigate);
  return (
    <div
      data-testid="lane-task"
      data-state={state}
      className={cn(
        'rounded-lg border border-border-soft bg-cream p-3.5',
        nav && 'cursor-pointer transition-colors hover:border-border'
      )}
      {...nav}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold uppercase text-ink-3">
          task · {pad(task.id)}
        </span>
      </div>
      <div
        className={cn(
          'my-1.5 mb-2 font-sans text-base font-semibold text-ink',
          state === 'done' && 'text-ink-3 line-through',
          state === 'doing' && 'text-doing'
        )}
      >
        {task.name}
      </div>
      <div className="flex flex-col gap-0.5 font-mono text-sm text-ink-3 [&_strong]:font-medium [&_strong]:text-ink-2">
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
function PhaseBlock({
  planId,
  phase,
  byId,
}: {
  planId: string;
  phase: Phase;
  byId: Map<number, Task>;
}) {
  const state = phaseStateOf(phase, byId);
  const phaseTasks = phase.taskIds.map(id => byId.get(id)).filter((t): t is Task => t != null);

  return (
    <div data-testid="phase" className="rounded-card border border-border bg-cream p-4 shadow-sm">
      <div className="mb-3.5 flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-cream-mid font-display text-xl font-extrabold text-ink">
          {pad(phase.index)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-bold text-ink">{phaseLabel(phase)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-sm text-ink-3">
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
        data-testid="phase-tasks"
        className="grid gap-3"
        style={{
          gridTemplateColumns: phase.parallel ? `repeat(${phase.taskIds.length}, 1fr)` : '1fr',
        }}
      >
        {phaseTasks.map(task => (
          <LaneTask key={task.id} planId={planId} task={task} />
        ))}
      </div>
    </div>
  );
}

/** The Swimlanes view: summary header + one phase container per phase. */
export function ExecSwimlanesView({ planId, detail }: { planId: string; detail: PlanDetail }) {
  const byId = tasksById(detail.tasks);
  const counts = tally(detail.tasks);
  const phaseWord = detail.phases.length === 1 ? 'phase' : 'phases';
  const taskWord = counts.total === 1 ? 'task' : 'tasks';
  const planTitle = humanizeSlug(stripIdPrefix(detail.name));

  return (
    <div data-testid="swimlanes" className="flex flex-1 flex-col gap-4 overflow-hidden px-7 py-5">
      <div className="flex items-baseline justify-between rounded-lg border border-border-soft bg-cream-mid px-4 py-3.5">
        <div>
          <div className={cn(LABEL, 'mb-0.5')}>{planTitle}</div>
          <div data-testid="exec-sum-title" className="font-display text-2xl font-bold text-ink">
            {detail.phases.length} {phaseWord} · {counts.total} {taskWord}
          </div>
        </div>
        <div data-testid="exec-sum-meta" className="font-mono text-sm text-ink-3">
          <strong className="font-semibold text-done">{counts.done} done</strong>
          <span className="mx-2">·</span>
          {counts.doing} doing
          <span className="mx-2">·</span>
          {counts.todo} todo
        </div>
      </div>

      {detail.phases.map(phase => (
        <PhaseBlock key={phase.index} planId={planId} phase={phase} byId={byId} />
      ))}
    </div>
  );
}
