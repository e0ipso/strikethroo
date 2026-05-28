/**
 * Execution blueprint — Execute-tab container (Plan 89, Task 04).
 *
 * The entry point mounted on the Plan Detail "Execute" tab. It receives the
 * plan-detail payload already fetched by the shell's data layer (no independent
 * fetch), holds the active view mode locally (default Swimlanes), renders an
 * in-screen segmented toggle, and shows either the Swimlanes or the Outline
 * view. Switching modes stays on the Execute tab and triggers no API calls and
 * no writes; loading and error states are owned upstream by the route, so this
 * container only renders once data is present.
 *
 * The toggle reuses the vendored `.snap`/`.snap__seg`/`.snap__btn` segmented
 * control already used by the Plan Detail Board, keeping the in-screen
 * view-switching interaction consistent across the app.
 */

import { useState } from 'react';
import type { PlanDetail } from '../../data/api';
import { ExecSwimlanesView } from './ExecSwimlanesView';
import { ExecOutlineView } from './ExecOutlineView';

/** The two interchangeable Execution-blueprint views; Swimlanes is the default. */
type ExecMode = 'swimlanes' | 'outline';

/** The in-screen segmented toggle between Swimlanes and Outline. */
function ExecToggle({ mode, onSelect }: { mode: ExecMode; onSelect: (mode: ExecMode) => void }) {
  return (
    <div className="snap">
      <span className="snap__label">View</span>
      <div className="snap__seg">
        <div
          className={`snap__btn${mode === 'swimlanes' ? ' snap__btn--active' : ''}`}
          onClick={() => onSelect('swimlanes')}
        >
          <div>Swimlanes</div>
          <div className="snap__btn-meta">phases as lanes</div>
        </div>
        <div
          className={`snap__btn${mode === 'outline' ? ' snap__btn--active' : ''}`}
          onClick={() => onSelect('outline')}
        >
          <div>Outline</div>
          <div className="snap__btn-meta">compact rows</div>
        </div>
      </div>
    </div>
  );
}

/** The Execute tab body: the view-mode toggle above the active view. */
export function ExecuteTab({ detail }: { detail: PlanDetail }) {
  const [mode, setMode] = useState<ExecMode>('swimlanes');

  return (
    <>
      <ExecToggle mode={mode} onSelect={setMode} />
      {mode === 'swimlanes' ? (
        <ExecSwimlanesView detail={detail} />
      ) : (
        <ExecOutlineView detail={detail} />
      )}
    </>
  );
}
