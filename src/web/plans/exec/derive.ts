/**
 * Pure derivation layer for the Execution blueprint feature (Plan 89, Task 01).
 *
 * The Swimlanes Execution-blueprint view depends on a tiny set of derived values
 * computed from the already-fetched `/api/plans/:id` payload: a `phaseStateOf`
 * helper (a phase's state from its tasks' states) and a done/doing/todo `tally`.
 * They are kept free of React so they are trivially unit-testable.
 *
 * Status honesty: the workspace model carries the RAW task status string
 * (`completed`, `pending`, `in-progress`, custom values). The single canonical
 * normalizer is `toTickboxState` (`../taskStatus`), mirroring the server's
 * derivation classifier. These helpers normalize through it and never re-derive
 * the `pending`→`todo` / `completed`→`done` mapping. No fetching, no mutation.
 *
 * Reference logic: `phaseStateOf` / the summary tally in
 * `scratch/ui/designs/screens-exec.jsx` (lines 15–20, 49–53), reimplemented
 * against the live model shape (phases carry `taskIds`, not embedded tasks).
 */

import type { Phase, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';

/**
 * The three presentational task/phase states. Declared locally (rather than
 * re-exported from the `primitives.tsx` module) so this pure module carries no
 * dependency on a JSX-bearing file and stays trivially unit-testable.
 */
export type ExecState = 'todo' | 'doing' | 'done';

/** A done/doing/todo count plus the total task count. */
export interface Tally {
  done: number;
  doing: number;
  todo: number;
  total: number;
}

/**
 * Derives a phase's state from its tasks' normalized states:
 * all `done` → `done`, all `todo` → `todo`, otherwise `doing`. A phase whose
 * task references resolve to no tasks is treated as `todo` (nothing started).
 * Mirrors the design's `phaseStateOf` exactly.
 */
export function phaseStateOf(phase: Phase, tasksById: Map<number, Task>): ExecState {
  const states = phase.taskIds
    .map(id => tasksById.get(id))
    .filter((t): t is Task => t != null)
    .map(t => toTickboxState(t.status));
  if (states.length === 0) return 'todo';
  if (states.every(s => s === 'done')) return 'done';
  if (states.every(s => s === 'todo')) return 'todo';
  return 'doing';
}

/**
 * Aggregates the live done/doing/todo task counts (and total) across a plan's
 * tasks, normalizing each task's raw status through `toTickboxState`. Drives the
 * Swimlanes summary header.
 */
export function tally(tasks: readonly Task[]): Tally {
  const result: Tally = { done: 0, doing: 0, todo: 0, total: tasks.length };
  for (const task of tasks) {
    const state: ExecState = toTickboxState(task.status);
    result[state] += 1;
  }
  return result;
}

/** Builds a `taskId → Task` lookup for `phaseStateOf`. */
export function tasksById(tasks: readonly Task[]): Map<number, Task> {
  return new Map(tasks.map(t => [t.id, t]));
}
