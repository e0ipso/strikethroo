/**
 * Execution blueprint — Outline view (Plan 89, Task 03).
 *
 * A faithful, read-only port of the design's `ExecOutlineView`
 * (`scratch/ui/designs/screens-exec.jsx`) onto Tailwind utilities (Plan 102) and
 * the shared primitives. It renders ONLY the outline subtree plus an optional
 * execution-summary callout; the shell, Chrome, and the view-mode toggle belong
 * to the Execute-tab container.
 *
 * Each phase renders a phase head (PHASE NN, title, parallel/sequential meta,
 * phase-state pill) above a dashed-rail list of task rows; each row carries the
 * task id, title, group, and a `StatusPill`. The rows are de-checkboxed (no
 * `Tickbox`) — a done task reads as a struck-through title — and become
 * clickable links to Task Detail when the task has an id. The phase state comes
 * from the `phaseStateOf` helper (no local recompute). No fetch, no mutation.
 *
 * The Execution Summary callout is rendered ONLY when the model supplies one
 * (`execSummaryOf` resolves the plan's parsed "Execution Summary" section); it
 * is omitted cleanly otherwise (Success Criterion #4). The model exposes no
 * per-phase commit count, so the commit meta clause is omitted entirely.
 */

import { StatusPill } from '../../components/primitives';
import type { Phase, PlanDetail, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';
import { taskNavProps } from '../taskNav';
import { useNavigate } from '../../router';
import { cn } from '../../vendor/utils/cn';
import { phaseStateOf, tasksById, execSummaryOf } from './derive';

/** Two-digit, zero-padded number (`01`, `12`). */
const pad = (n: number): string => String(n).padStart(2, '0');

/** The human-facing label for a phase (its name, or a `Phase N` fallback). */
const phaseLabel = (phase: Phase): string => phase.name?.trim() || `Phase ${phase.index}`;

/** A single outline task row — de-checkboxed, struck through when done, clickable. */
function OutlineRow({ planId, task }: { planId: string; task: Task }) {
  const navigate = useNavigate();
  const isDone = toTickboxState(task.status) === 'done';
  const nav = taskNavProps(planId, task.id, navigate);
  return (
    <div
      data-testid="outline-row"
      data-state={toTickboxState(task.status)}
      className={cn(
        // The dashed-rail connector tick is the `before:` pseudo-element.
        'relative flex items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0',
        "before:absolute before:-left-px before:top-1/2 before:h-px before:w-3.5 before:bg-border before:content-['']",
        nav && 'cursor-pointer hover:bg-cream'
      )}
      {...nav}
    >
      <span className="w-8 shrink-0 font-mono text-sm font-medium text-ink-3">{pad(task.id)}</span>
      <span
        className={cn(
          'flex-1 font-sans text-base font-semibold text-ink',
          isDone && 'text-ink-3 line-through'
        )}
      >
        {task.name}
      </span>
      <span className="w-60 shrink-0 truncate font-mono text-sm text-ink-3">
        {task.group ?? ''}
      </span>
      <StatusPill kind={toTickboxState(task.status)} />
    </div>
  );
}

/** A single phase block: phase head + a dashed-rail list of task rows. */
function OutlinePhase({
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
    <div className="mb-4">
      <div
        data-testid="outline-phase-head"
        className="flex items-center gap-3 rounded-lg border border-l-4 border-dalia/30 border-l-dalia-dark bg-dalia-bg px-4 py-3"
      >
        <span className="font-mono text-xs font-bold uppercase text-ink-3">
          PHASE {pad(phase.index)}
        </span>
        <span className="flex-1 font-display text-2xl font-bold text-ink">{phaseLabel(phase)}</span>
        <span className="font-mono text-sm text-ink-3">
          {phase.parallel ? '⇉ parallel' : '→ sequential'}
        </span>
        <StatusPill kind={state} />
      </div>

      <div className="ml-5 border-l border-dashed border-border py-2">
        {phaseTasks.map(task => (
          <OutlineRow key={task.id} planId={planId} task={task} />
        ))}
      </div>
    </div>
  );
}

/** The Outline view: per-phase task lists + an optional Execution Summary. */
export function ExecOutlineView({ planId, detail }: { planId: string; detail: PlanDetail }) {
  const byId = tasksById(detail.tasks);
  const summary = execSummaryOf(detail);

  return (
    <div data-testid="outline" className="flex-1 overflow-hidden px-7 py-5">
      {detail.phases.map(phase => (
        <OutlinePhase key={phase.index} planId={planId} phase={phase} byId={byId} />
      ))}

      {summary && (
        <div
          data-testid="exec-summary"
          className="mt-5 rounded-lg border-l-4 border-l-dalia-dark bg-dalia-bg px-4 py-3"
        >
          <div className="mb-1 font-mono text-xs font-bold uppercase text-dalia-deep">
            {summary.eyebrow}
          </div>
          <div className="text-base text-ink">{summary.text}</div>
        </div>
      )}
    </div>
  );
}
