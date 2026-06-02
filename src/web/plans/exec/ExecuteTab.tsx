/**
 * Execution blueprint — Tasks-tab container (Plan 89, Task 04).
 *
 * The entry point mounted on the Plan Detail "Tasks" tab. It receives the
 * plan-detail payload already fetched by the shell's data layer (no independent
 * fetch) and renders the Swimlanes view. There is no view selector: Swimlanes is
 * the sole Execution-blueprint view (Plan 103). Loading and error states are
 * owned upstream by the route, so this container only renders once data is
 * present, and it triggers no API calls and no writes.
 */

import type { PlanDetail } from '../../data/api';
import { ExecSwimlanesView } from './ExecSwimlanesView';

/** The Tasks tab body: the Swimlanes Execution-blueprint view. */
export function ExecuteTab({ detail }: { detail: PlanDetail }) {
  return <ExecSwimlanesView planId={String(detail.id)} detail={detail} />;
}
