/**
 * Shared affordance for the read-only task surfaces (the Plan-tab
 * `BlueprintRail` and the Tasks-tab `ExecSwimlanesView`).
 *
 * Each surface renders a task row/card that, when the task has an addressable
 * id, navigates to the Task Detail route (`/plans/:id/tasks/:taskId`). The plan
 * segment is the plan's composite `name` (`{id}--{slug}`), threaded explicitly
 * from the Plan Detail route and URL-encoded once on emit — never recovered from
 * `window.location`. A task whose id is `undefined` has no target URL and must
 * stay inert (no click, no keyboard activation, no affordance), so this helper
 * returns `null` for it and callers spread nothing.
 *
 * The returned object is the set of DOM props that turn an otherwise
 * presentational element into a keyboard-activatable control consistent with
 * an interactive row: `role="button"`, `tabIndex={0}`, a pointer `onClick`, and
 * an `onKeyDown` that activates on Enter/Space. Callers add the visual
 * affordance via the matching `--clickable` CSS modifier.
 */

import type { KeyboardEvent } from 'react';

/** The DOM props that make a task surface element navigate + keyboard-activate. */
export interface TaskNavProps {
  role: 'button';
  tabIndex: 0;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Builds the interactive props for a task row given the plan's composite `name`
 * and the task's numeric id. Returns `null` when the task has no addressable id,
 * so the caller renders it inertly exactly as before.
 */
export function taskNavProps(
  planName: string,
  taskId: number | undefined,
  navigate: (path: string) => void
): TaskNavProps | null {
  if (typeof taskId !== 'number') return null;

  const go = () => navigate(`/plans/${encodeURIComponent(planName)}/tasks/${taskId}`);

  return {
    role: 'button',
    tabIndex: 0,
    onClick: go,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        go();
      }
    },
  };
}
