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
 * The toggle reproduces the design's segmented control with Tailwind utilities
 * (Plan 102), keeping the in-screen view-switching interaction consistent across
 * the app.
 */

import { useState } from 'react';
import type { PlanDetail } from '../../data/api';
import { cn } from '../../vendor/utils/cn';
import { ExecSwimlanesView } from './ExecSwimlanesView';
import { ExecOutlineView } from './ExecOutlineView';

/** The two interchangeable Execution-blueprint views; Swimlanes is the default. */
type ExecMode = 'swimlanes' | 'outline';

/** One segmented-control button: a primary label over a muted meta line. */
function ExecToggleBtn({
  active,
  onClick,
  label,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  meta: string;
}) {
  return (
    <div
      className={cn(
        'flex-1 cursor-default rounded-md px-3 py-1.5 text-center text-sm font-medium text-ink-3',
        active &&
          'bg-cream font-semibold text-ink shadow-sm ring-1 ring-border-soft dark:bg-cream-deep'
      )}
      onClick={onClick}
    >
      <div>{label}</div>
      <div
        className={cn('mt-px font-mono text-xs font-medium', active ? 'text-ink-3' : 'text-ink-4')}
      >
        {meta}
      </div>
    </div>
  );
}

/** The in-screen segmented toggle between Swimlanes and Outline. */
function ExecToggle({ mode, onSelect }: { mode: ExecMode; onSelect: (mode: ExecMode) => void }) {
  return (
    <div
      data-testid="exec-toggle"
      className="flex items-center gap-3 border-b border-border-soft bg-cream px-7 py-3"
    >
      <span className="font-mono text-xs font-semibold uppercase text-ink-3">View</span>
      <div className="flex max-w-2xl flex-1 rounded-lg bg-cream-mid p-0.5 ring-1 ring-inset ring-border-soft">
        <ExecToggleBtn
          active={mode === 'swimlanes'}
          onClick={() => onSelect('swimlanes')}
          label="Swimlanes"
          meta="phases as lanes"
        />
        <ExecToggleBtn
          active={mode === 'outline'}
          onClick={() => onSelect('outline')}
          label="Outline"
          meta="compact rows"
        />
      </div>
    </div>
  );
}

/** The Execute tab body: the view-mode toggle above the active view. */
export function ExecuteTab({ detail }: { detail: PlanDetail }) {
  const [mode, setMode] = useState<ExecMode>('swimlanes');

  const planId = String(detail.id);

  return (
    <>
      <ExecToggle mode={mode} onSelect={setMode} />
      {mode === 'swimlanes' ? (
        <ExecSwimlanesView planId={planId} detail={detail} />
      ) : (
        <ExecOutlineView planId={planId} detail={detail} />
      )}
    </>
  );
}
