/**
 * Shared loading / error surfaces for data-layer-backed route slots.
 *
 * These are visible, designed surfaces (using the vendored shell classes) so
 * an unreachable API renders an explicit error state rather than a crash or a
 * blank screen. They carry no domain data — the actual screen content is owned
 * by later screen tickets.
 */

import type { ReactNode } from 'react';
import { StatusPill } from './primitives';

const surfaceStyle = {
  padding: '28px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: 'var(--ink-3)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
} as const;

/** A visible loading surface. */
export function LoadingSurface({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={surfaceStyle} role="status" aria-live="polite">
      <StatusPill kind="doing" label="loading" />
      <span>{label}</span>
    </div>
  );
}

/** A visible error surface — never a blank or a thrown error. */
export function ErrorSurface({ error }: { error: Error }) {
  return (
    <div style={surfaceStyle} role="alert">
      <StatusPill kind="todo" label="unavailable" />
      <span>
        Could not reach the workspace API. Is the server running?
        <br />
        <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          {error.message}
        </span>
      </span>
    </div>
  );
}

/** A neutral placeholder shown on the `data` state until a screen ticket lands. */
export function PlaceholderSurface({ children }: { children: ReactNode }) {
  return <div style={{ ...surfaceStyle, color: 'var(--ink-2)' }}>{children}</div>;
}
