/**
 * Shared loading / error surfaces for data-layer-backed route slots.
 *
 * These are visible, designed surfaces (Tailwind utilities; Plan 102) so an
 * unreachable API renders an explicit error state rather than a crash or a
 * blank screen. They carry no domain data — the actual screen content is owned
 * by later screen tickets. The token-backed colours (`text-ink-*`) flip with
 * the `.dark` theme automatically.
 */

import type { ReactNode } from 'react';
import { cn } from '../vendor/utils/cn';
import { StatusPill } from './primitives';

/** Shared surface layout/type for every state slot. */
const SURFACE = 'flex items-center gap-3 p-7 font-sans text-sm';

/** A visible loading surface. */
export function LoadingSurface({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={cn(SURFACE, 'text-ink-3')} role="status" aria-live="polite">
      <StatusPill kind="doing" label="loading" />
      <span>{label}</span>
    </div>
  );
}

/** A visible error surface — never a blank or a thrown error. */
export function ErrorSurface({ error }: { error: Error }) {
  return (
    <div className={cn(SURFACE, 'text-ink-3')} role="alert">
      <StatusPill kind="todo" label="unavailable" />
      <span>
        Could not reach the workspace API. Is the server running?
        <br />
        <span className="font-mono text-xs text-ink-4">{error.message}</span>
      </span>
    </div>
  );
}

/** A neutral placeholder shown on the `data` state until a screen ticket lands. */
export function PlaceholderSurface({ children }: { children: ReactNode }) {
  return <div className={cn(SURFACE, 'text-ink-2')}>{children}</div>;
}
