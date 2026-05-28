/**
 * Maps a workspace task `status` string to the three presentational states the
 * design's `Tickbox` / status classes understand (`todo` | `doing` | `done`).
 *
 * The data layer keeps the raw status verbatim (`completed`, `pending`,
 * `in-progress`, or any custom value an author wrote). Screens never branch on
 * the raw string directly — they map through here so the status vocabulary lives
 * in one place. The mapping mirrors the server's derivation classifier
 * (`src/serve/derivation.ts`): `completed` -> done, `pending`/absent -> todo,
 * and anything else (in-progress / unknown) -> doing ("started").
 */

import type { TickboxState } from '../components/primitives';

/** Normalizes a raw task status to a `Tickbox`/`rail__task--<status>` state. */
export function toTickboxState(status: string | undefined): TickboxState {
  if (status === 'completed') return 'done';
  if (status === 'pending' || status === undefined) return 'todo';
  return 'doing';
}
