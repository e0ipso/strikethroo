/**
 * Live connection indicator (Plan 92, Task 003 — Section C of the live-update
 * pipeline).
 *
 * A small, design-faithful badge that reflects the shared SSE connection state
 * (Task 001) so the user can trust the view is following live workspace state. A
 * silently dead stream is worse than a stale-but-honest one, so this surfaces
 * `connected` versus `reconnecting` accurately.
 *
 * Styling reuses the design's ghost-button / snapshot vocabulary (the `.snap`
 * bar's "Live" affordance): a healthy treatment when connected and a muted
 * treatment while backing off. It renders in two places the design marks the
 * "Live" affordance — the Board snapshot bar and the Plan Detail header.
 *
 * Presentation-only beyond reading connection state: it performs no fetching and
 * holds no snapshot logic. The transient `connecting` state reads as
 * reconnecting (both are "not yet live").
 */

import { useConnectionState, type ConnectionState } from '../data/liveConnection';

/** Maps a connection state to the indicator's label and modifier class. */
function present(state: ConnectionState): { label: string; live: boolean } {
  // `connected` is the only healthy/live treatment; `connecting` and
  // `reconnecting` both render as the muted "reconnecting" treatment.
  if (state === 'connected') return { label: 'Live', live: true };
  return { label: 'Reconnecting', live: false };
}

/**
 * The connection badge. Pass `compact` for the tighter header placement; the
 * default suits the Board `.snap` bar next to the snapshot segments.
 */
export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const state = useConnectionState();
  const { label, live } = present(state);

  return (
    <span
      className={
        'conn-ind' +
        (live ? ' conn-ind--live' : ' conn-ind--reconnecting') +
        (compact ? ' conn-ind--compact' : '')
      }
      role="status"
      aria-live="polite"
      title={`Live updates: ${state}`}
      data-state={state}
    >
      <span className="conn-ind__dot" />
      {label}
    </span>
  );
}
