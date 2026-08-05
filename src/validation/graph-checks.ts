/**
 * Structural checks over the task dependency graph and the execution blueprint:
 * dangling dependency references, dependency cycles, blueprint/task consistency
 * in both directions, agreement among the three coexisting task-id notions, and
 * task-id uniqueness within a plan.
 *
 * Scope is `plans/` only; `archive/` participates solely in plan-id uniqueness.
 *
 * Stub: the orchestrator already calls this, so the implementation lands here
 * without touching `workspace.ts`.
 */

import { Finding } from './types';

/**
 * Runs the graph and identity checks against an already-resolved absolute
 * workspace root. Pure: reads only, never writes, never exits.
 */
export function graphChecks(root: string): Finding[] {
  // Stub — no checks implemented yet. The parameter is part of the settled
  // signature and is referenced here only to keep the unused-argument rule
  // satisfied until the checks land.
  void root;
  return [];
}
