/**
 * Execution-blueprint rail — the left column of the Plan Detail Reader.
 *
 * Ported from the design's `screens-detail.jsx` (`PlanDetailReader`, the `.rail`
 * block) and styled with Tailwind utilities (Plan 102). Presentation-only: it
 * renders the plan's derived phases and their tasks entirely from the
 * `GET /api/plans/:id` payload and parses NO markdown. Rows are de-checkboxed —
 * a done task reads as a struck-through, muted name (not a Tickbox) — and become
 * clickable links to Task Detail when the task has an id (via `taskNavProps`).
 *
 * Design-only fields the live model does not expose are omitted rather than
 * fabricated: the model carries no per-phase commit count, so the `· N commits`
 * segment of the design's meta line is dropped (never shown as `0`/`undefined`).
 */

import type { Phase, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';
import { taskNavProps } from '../taskNav';
import { useNavigate } from '../../router';
import { Chip } from '../../components/primitives';
import { cn } from '../../vendor/utils/cn';

export interface BlueprintRailProps {
  /** The plan id, threaded down so each row links to its Task Detail route. */
  planId: string;
  phases: Phase[];
  tasks: Task[];
}

/** Two-digit, zero-padded task id for the task-number column. */
const padId = (id: number): string => String(id).padStart(2, '0');

/** Eyebrow label (the design's `.label` from base.css). */
const LABEL = 'font-sans text-base font-semibold uppercase tracking-widest text-dalia-dark';

/** The execution-blueprint rail: phases with their status-colored task rows. */
export function BlueprintRail({ planId, phases, tasks }: BlueprintRailProps) {
  const navigate = useNavigate();
  const tasksById = new Map(tasks.map(t => [t.id, t]));

  return (
    <div
      data-testid="blueprint-rail"
      className="flex h-full flex-col gap-1.5 border-l border-border bg-cream-mid px-4 py-4"
    >
      <div className={cn(LABEL, 'mb-2')}>Execution blueprint</div>

      {phases.map(phase => (
        <div
          key={phase.index}
          data-testid="rail-phase"
          className="mb-1.5 rounded-card border border-border-soft bg-cream px-3 pb-1 pt-2.5 dark:shadow-sm"
        >
          <div className="mb-0.5 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-cream-mid font-display text-sm font-bold text-ink">
              {phase.index}
            </span>
            <span className="flex-1 font-display text-base font-bold leading-tight text-ink">
              {phase.name ?? `Phase ${phase.index}`}
            </span>
          </div>
          <div className="pb-1.5 font-mono text-xs text-ink-3">
            {phase.parallel ? '⇉ parallel' : '→ sequential'} · {phase.taskIds.length} tasks
          </div>

          {phase.taskIds.map(taskId => {
            const task = tasksById.get(taskId);
            if (!task) return null;
            const isDone = toTickboxState(task.status) === 'done';
            const nav = taskNavProps(planId, task.id, navigate);
            return (
              <div
                key={taskId}
                data-testid="rail-task"
                className={cn(
                  'flex gap-2 border-t border-border-soft px-1 py-1.5',
                  nav && 'cursor-pointer rounded hover:bg-cream'
                )}
                {...nav}
              >
                <span className="mt-px font-mono text-xs text-ink-3">{padId(task.id)}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-base font-medium leading-snug text-ink',
                      isDone && 'text-ink-3 line-through'
                    )}
                  >
                    {task.name}
                  </div>
                  {task.group && (
                    <div className="mt-px font-mono text-xs text-ink-3">{task.group}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="mt-auto border-t border-border-soft pt-2.5 font-mono text-xs italic leading-normal text-ink-3">
        Multiple tasks in a parallel phase can be in <Chip>doing</Chip> at once.
      </div>
    </div>
  );
}
