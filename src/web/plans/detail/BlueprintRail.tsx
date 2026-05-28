/**
 * Execution-blueprint rail — the left column of the Plan Detail Reader.
 *
 * Ported from the design's `screens-detail.jsx` (`PlanDetailReader`, the `.rail`
 * block) and styled with the vendored `.rail*` classes (src/web/vendor/styles/
 * detail.css). Presentation-only: it renders the plan's derived phases and their
 * tasks entirely from the `GET /api/plans/:id` payload (Plan 84 over the Plan 83
 * model) and parses NO markdown.
 *
 * Design-only fields the live model does not expose are omitted rather than
 * fabricated: the model carries no per-phase commit count, so the `· N commits`
 * segment of the design's meta line is dropped (never shown as `0`/`undefined`).
 */

import type { Phase, Task } from '../../data/api';
import { Tickbox } from '../../components/primitives';
import { toTickboxState } from '../taskStatus';

export interface BlueprintRailProps {
  phases: Phase[];
  tasks: Task[];
}

/** Two-digit, zero-padded task id for the `.rail__task-num` column. */
const padId = (id: number): string => String(id).padStart(2, '0');

/** The execution-blueprint rail: phases with their status-colored task rows. */
export function BlueprintRail({ phases, tasks }: BlueprintRailProps) {
  const tasksById = new Map(tasks.map(t => [t.id, t]));

  return (
    <div className="rail">
      <div className="label" style={{ marginBottom: 8 }}>
        Execution blueprint
      </div>

      {phases.map(phase => (
        <div key={phase.index} className="rail__phase">
          <div className="rail__phase-head">
            <span className="rail__phase-num">{phase.index}</span>
            <span className="rail__phase-title">{phase.name ?? `Phase ${phase.index}`}</span>
          </div>
          <div className="rail__phase-meta">
            {phase.parallel ? '⇉ parallel' : '→ sequential'} · {phase.taskIds.length} tasks
          </div>

          {phase.taskIds.map(taskId => {
            const task = tasksById.get(taskId);
            if (!task) return null;
            const state = toTickboxState(task.status);
            return (
              <div key={taskId} className={`rail__task rail__task--${state}`}>
                <Tickbox state={state} />
                <span className="rail__task-num">{padId(task.id)}</span>
                <div className="rail__task-body">
                  <div className="rail__task-name">{task.name}</div>
                  {task.group && <div className="rail__task-group">{task.group}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="rail__hint">
        Multiple tasks in a parallel phase can be in <span className="chip">doing</span> at once.
      </div>
    </div>
  );
}
