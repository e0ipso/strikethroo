/**
 * Execution blueprint — Outline view (Plan 89, Task 03).
 *
 * A faithful, read-only port of the design's `ExecOutlineView`
 * (`scratch/ui/designs/screens-exec.jsx`) onto the vendored Dalia outline/reader
 * classes and the shared primitives. It renders ONLY the `.outline` subtree plus
 * an optional `.reader__summary` callout; the shell, Chrome, and the view-mode
 * toggle belong to the Execute-tab container (Task 04).
 *
 * Each phase renders an `outline__phase-head` (PHASE NN, title, parallel/
 * sequential meta, phase-state pill) above an `outline__list` of task rows; each
 * row pairs a `Tickbox` with the task id, title, group, and a `StatusPill`. The
 * phase state comes from the Task 01 `phaseStateOf` helper (no local recompute).
 * The component performs no fetch and no mutation.
 *
 * The Execution Summary callout is rendered ONLY when the model supplies one
 * (`execSummaryOf` resolves the plan's parsed "Execution Summary" section); it
 * is omitted cleanly otherwise (Success Criterion #4). The model exposes no
 * per-phase commit count, so the commit meta clause is omitted entirely.
 */

import { StatusPill } from '../../components/primitives';
import type { Phase, PlanDetail, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';
import { phaseStateOf, tasksById, execSummaryOf } from './derive';

/** Two-digit, zero-padded number (`01`, `12`). */
const pad = (n: number): string => String(n).padStart(2, '0');

/** The human-facing label for a phase (its name, or a `Phase N` fallback). */
const phaseLabel = (phase: Phase): string => phase.name?.trim() || `Phase ${phase.index}`;

/** A single outline task row. */
function OutlineRow({ task }: { task: Task }) {
  const state = toTickboxState(task.status);
  return (
    <div className={`outline__row outline__row--${state}`}>
      <span className="outline__row-id">{pad(task.id)}</span>
      <span className="outline__row-title">{task.name}</span>
      <span className="outline__row-group">{task.group ?? ''}</span>
      <StatusPill kind={state} />
    </div>
  );
}

/** A single phase block: phase head + a dashed-rail list of task rows. */
function OutlinePhase({ phase, byId }: { phase: Phase; byId: Map<number, Task> }) {
  const state = phaseStateOf(phase, byId);
  const phaseTasks = phase.taskIds.map(id => byId.get(id)).filter((t): t is Task => t != null);

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="outline__phase-head">
        <span className="outline__phase-num">PHASE {pad(phase.index)}</span>
        <span className="outline__phase-title">{phaseLabel(phase)}</span>
        <span className="outline__phase-meta">
          {phase.parallel ? '⇉ parallel' : '→ sequential'}
        </span>
        <StatusPill kind={state} />
      </div>

      <div className="outline__list">
        {phaseTasks.map(task => (
          <OutlineRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

/** The Outline view: per-phase task lists + an optional Execution Summary. */
export function ExecOutlineView({ detail }: { detail: PlanDetail }) {
  const byId = tasksById(detail.tasks);
  const summary = execSummaryOf(detail);

  return (
    <div className="outline">
      {detail.phases.map(phase => (
        <OutlinePhase key={phase.index} phase={phase} byId={byId} />
      ))}

      {summary && (
        <div className="reader__summary" style={{ marginTop: 22 }}>
          <div className="reader__summary-eyebrow">{summary.eyebrow}</div>
          <div className="reader__summary-text">{summary.text}</div>
        </div>
      )}
    </div>
  );
}
