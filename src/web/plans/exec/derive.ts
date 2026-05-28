/**
 * Pure derivation layer for the Execution blueprint feature (Plan 89, Task 01).
 *
 * Both Execution-blueprint views (Swimlanes and Outline) depend on a tiny set of
 * derived values computed from the already-fetched `/api/plans/:id` payload: a
 * `phaseStateOf` helper (a phase's state from its tasks' states) and a
 * done/doing/todo `tally`. They are kept free of React so they are trivially
 * unit-testable and shared by both views without drift.
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

import type { TickboxState } from '../../components/primitives';
import type { Phase, PlanDetail, Task } from '../../data/api';
import { toTickboxState } from '../taskStatus';

/** The three presentational task/phase states. */
export type ExecState = TickboxState; // 'todo' | 'doing' | 'done'

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
    result[toTickboxState(task.status)] += 1;
  }
  return result;
}

/** Builds a `taskId → Task` lookup for `phaseStateOf`. */
export function tasksById(tasks: readonly Task[]): Map<number, Task> {
  return new Map(tasks.map(t => [t.id, t]));
}

/**
 * The optional Execution Summary callout shown by the Outline view. The model
 * does not expose a structured summary, but it does parse the plan markdown into
 * named `##` sections; when an "Execution Summary" section is present we surface
 * it as an eyebrow + body. Returns `undefined` when no such section exists, so
 * the callout is omitted gracefully (Success Criterion #4).
 */
export interface ExecSummary {
  eyebrow: string;
  text: string;
}

/** Heading text that identifies the Execution Summary section, case-insensitive. */
const SUMMARY_HEADING = 'execution summary';

/**
 * Extracts the optional Execution Summary from the detail's parsed sections.
 * The eyebrow carries the plan's completion state; the text is the section's
 * first non-empty, non-heading line (the summary's lead). Omitted entirely when
 * the plan has no Execution Summary section or it has no renderable body.
 */
export function execSummaryOf(detail: PlanDetail): ExecSummary | undefined {
  const section = detail.sections.find(s => s.heading.trim().toLowerCase() === SUMMARY_HEADING);
  if (!section) return undefined;

  const lead = section.content
    .split('\n')
    .map(line => line.replace(/^[-*>\s]+/, '').trim())
    .find(line => line.length > 0);
  if (!lead) return undefined;

  return { eyebrow: 'Execution summary', text: lead };
}
