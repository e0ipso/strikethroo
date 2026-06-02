/**
 * Archive operation for `npx strikethroo serve`.
 *
 * The serve web app is a read-only viewer over `.ai/strikethroo/` with exactly
 * one sanctioned mutation: moving a plan that has reached the derived `done`
 * state from `plans/NN--slug/` to `archive/NN--slug/`. This module is that
 * mutation's authoritative guard — a single, HTTP-free function the route
 * handler and the tests both call.
 *
 * It validates three preconditions, in order — the plan exists, currently lives
 * under `plans/` (not already archived), and is `done` per the derived state in
 * `workspace-model.ts` — then performs a single atomic `fs.rename` of the whole
 * plan directory. It never deletes files, never edits file contents, and never
 * falls back to a non-atomic copy-then-delete. Expected precondition failures
 * are returned as a typed result, not thrown; only an unexpected filesystem
 * error surfaces as the `fs-error` variant. Node built-ins only.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPlanDetail, PlanDetail } from './workspace-model';

/**
 * Outcome of an {@link archivePlan} call. A discriminated union mirroring the
 * serve layer's existing result convention (see `self-review.ts`): callers map
 * `reason` to HTTP status codes without re-deriving anything.
 */
export type ArchiveResult =
  | { ok: true; plan: PlanDetail }
  | {
      ok: false;
      reason: 'not-found' | 'already-archived' | 'not-done' | 'destination-exists' | 'fs-error';
      message: string;
    };

/**
 * Validates the archive preconditions for the plan whose composite directory
 * `name` (`{id}--{slug}`) is given, under `root` (the absolute `.ai/strikethroo`
 * directory) and, if they pass, atomically renames its directory from `plans/`
 * into `archive/`, returning the refreshed model.
 *
 * On any precondition failure it performs zero filesystem changes and returns a
 * typed failure with an actionable message. The only write it performs beyond
 * the rename is creating the `archive/` directory if it does not yet exist,
 * which is required for the rename's destination parent to resolve.
 *
 * Resolution is by composite `name` via {@link getPlanDetail}; the source and
 * destination paths derive from the RESOLVED entry's `dir`/`name`, never from
 * the raw request segment.
 */
export const archivePlan = async (root: string, name: string): Promise<ArchiveResult> => {
  const detail = getPlanDetail(root, name);
  if (!detail) {
    return {
      ok: false,
      reason: 'not-found',
      message: `Plan ${name} was not found.`,
    };
  }

  if (detail.archived) {
    return {
      ok: false,
      reason: 'already-archived',
      message: `Plan ${name} is already archived.`,
    };
  }

  if (detail.state !== 'done') {
    return {
      ok: false,
      reason: 'not-done',
      message: `Plan ${name} is not in the done state and cannot be archived.`,
    };
  }

  const src = detail.dir;
  const dest = path.join(root, 'archive', detail.name);

  if (fs.existsSync(dest)) {
    return {
      ok: false,
      reason: 'destination-exists',
      message: `Plan ${name} cannot be archived: a directory already exists at its archive location.`,
    };
  }

  try {
    // The destination's parent (`archive/`) must exist for the rename to land.
    // Creating it is benign and never touches plan contents.
    await fs.promises.mkdir(path.join(root, 'archive'), { recursive: true });
    await fs.promises.rename(src, dest);
  } catch {
    return {
      ok: false,
      reason: 'fs-error',
      message: `Plan ${name} could not be archived due to a filesystem error.`,
    };
  }

  // Re-resolve so the returned model reflects the new archive/ location.
  const moved = getPlanDetail(root, name);
  if (!moved) {
    return {
      ok: false,
      reason: 'fs-error',
      message: `Plan ${name} was moved but could not be re-read.`,
    };
  }

  return { ok: true, plan: moved };
};
